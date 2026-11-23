import type { Context } from '@deepseek-ai/cordis'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { renderUml, validateUml } from './headless.ts'
import { jsonObject } from './tool-output.ts'

export { jsonObject } from './tool-output.ts'

const output = {
  schema: { type: 'object', additionalProperties: true } as const,
  render: (_args: unknown, value: unknown): ContentBlock[] => [
    { type: 'text', text: JSON.stringify(value) },
  ],
}

export function registerTools(ctx: Context): () => void {
  const disposeCheck = ctx.tools.register(defineTool({
    name: 'uml_validate',
    description: 'Check PlantUML source syntax using the official headless engine. No Java required. Source must have @startuml and @enduml and cannot use includes.',
    parameters: { source: { type: 'string', required: true, description: 'PlantUML source text.' } },
    output,
    execute: async (args: { source: string }) => jsonObject(await validateUml(args.source)),
  }))
  const disposeRender = ctx.tools.register(defineTool({
    name: 'uml_render',
    description: 'Render PlantUML text to SVG with the official local engine. The response includes an SVG string; save to a .svg file with the usual file tools if required.',
    parameters: { source: { type: 'string', required: true, description: 'PlantUML source text.' } },
    output,
    execute: async (args: { source: string }) => jsonObject(await renderUml(args.source)),
  }))
  return () => { disposeRender(); disposeCheck() }
}
