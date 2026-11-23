import Schema from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
function checkSource(source) {
	if (!source.trim()) return "PlantUML source is empty.";
	if (source.length > 1e5) return "PlantUML source exceeds 100,000 characters.";
	if (/(?:^|\n)\s*!(?:include(?:url|many|once)?|import|include_sprites)\b/i.test(source)) return "External includes and imports are disabled in dsh-uml.";
	const start = source.match(/^\s*@start([a-z]+)\b/im);
	if (!start) return "Missing @startuml (or another @start... marker).";
	if (!new RegExp("^\\s*@end" + start[1] + "\\b", "im").test(source)) return "Missing matching @end" + start[1] + " marker.";
	return null;
}
// src/headless.ts
/** Official PlantUML TeaVM headless engine. No Java, network or file IO. */
let instancePromise;
async function engine() {
	if (!instancePromise) instancePromise = (async () => {
		const viz = await import("@viz-js/viz");
		let enginePromise;
		globalThis.Viz = { instance: () => enginePromise ??= viz.instance() };
		return import("@plantuml/mcp-js/engine.js");
	})().catch((error) => {
		instancePromise = void 0;
		throw error;
	});
	return instancePromise;
}
function parseResult(json) {
	const result = JSON.parse(json);
	if (typeof result?.valid !== "boolean") throw new Error("PlantUML engine returned an invalid response.");
	return result;
}
function preflight(source) {
	const error = checkSource(source);
	return error ? {
		valid: false,
		errorMessage: error
	} : null;
}
async function validateUml(source) {
	const rejected = preflight(source);
	if (rejected) return rejected;
	return parseResult((await engine()).checkSyntax(source));
}
async function renderUml(source) {
	const rejected = preflight(source);
	if (rejected) return rejected;
	const api = await engine();
	return parseResult(await new Promise((resolve, reject) => {
		let settled = false;
		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				reject(/* @__PURE__ */ new Error("PlantUML rendering timed out."));
			}
		}, 2e4);
		try {
			api.renderSvg(source, (json) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve(json);
			});
		} catch (error) {
			if (!settled) {
				settled = true;
				clearTimeout(timer);
				reject(error);
			}
		}
	}));
}
// src/tool-output.ts
/** Strip undefined optional result fields while preserving meaningful failures. */
function jsonObject(value) {
	return JSON.parse(JSON.stringify(value));
}
// src/tools.ts
const output = {
	schema: {
		type: "object",
		additionalProperties: true
	},
	render: (_args, value) => [{
		type: "text",
		text: JSON.stringify(value)
	}]
};
function registerTools(ctx) {
	const disposeCheck = ctx.tools.register(defineTool({
		name: "uml_validate",
		description: "Check PlantUML source syntax using the official headless engine. No Java required. Source must have @startuml and @enduml and cannot use includes.",
		parameters: { source: {
			type: "string",
			required: true,
			description: "PlantUML source text."
		} },
		output,
		execute: async (args) => jsonObject(await validateUml(args.source))
	}));
	const disposeRender = ctx.tools.register(defineTool({
		name: "uml_render",
		description: "Render PlantUML text to SVG with the official local engine. The response includes an SVG string; save to a .svg file with the usual file tools if required.",
		parameters: { source: {
			type: "string",
			required: true,
			description: "PlantUML source text."
		} },
		output,
		execute: async (args) => jsonObject(await renderUml(args.source))
	}));
	return () => {
		disposeRender();
		disposeCheck();
	};
}
// src/index.ts
/** Host half: independent of Better Sidebar. */
const Config = Schema.object({});
const name = "dsh-uml";
const inject = ["tools"];
function apply(ctx, _config) {
	ctx.effect(() => registerTools(ctx), "dsh-uml: PlantUML tools");
}
export { Config, apply, inject, name };
