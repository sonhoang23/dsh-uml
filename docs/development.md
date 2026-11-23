# Development and live acceptance

[← README](../README.md) · [Troubleshooting](troubleshooting.md)

DSH UML Studio is currently an **experimental MVP**. The source, tests, and build scripts are committed, but live acceptance against the target DSH profile and browser is **not yet confirmed**.

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Server-side plugin entry point |
| `src/tools.ts`, `src/headless.ts` | Register agent tools and use the official headless PlantUML engine |
| `src/client/index.tsx` | Native DSH sidebar tab and optional Better Sidebar registrations |
| `src/client/studio.tsx` | PlantUML editor, preview, zoom/pan/fit, imports and exports |
| `src/client/renderer.ts` | Local browser renderer with SVG sanitization |
| `src/client/fs.ts` | Session-scoped authenticated Better Sidebar file operations |
| `src/safety.ts` | Source size, include/import guards, and UML extension checks |
| `tests/` | Current regression tests |
| `examples/` | Sample `.puml` source |

## Build and test

Requirements: Node.js `>=24.9.0`, pnpm, and a compatible DSH version. The package is currently `private: true`; build it from source before installing in a DSH profile.

~~~bash
pnpm install
pnpm check
~~~

`pnpm check` expands to:

~~~bash
pnpm typecheck
pnpm test
pnpm build
~~~

Expected build artifacts include `lib/index.js` and `lib/client.js`. A successful local build does **not** prove host/browser compatibility, so complete the live acceptance checklist below before marking the plugin stable.

### Technical notes

- **Native UI:** `sidebarRightTabs` plus `sidebar.right.pane.tab`; no DSH core patch.
- **Optional file integration:** Better Sidebar `registerFileViewer`, `registerTab`, `registerFileAction`, and `registerTabAction`; no edits to Better Sidebar's source.
- **Browser:** `@plantuml/core` TeaVM with `@viz-js/viz` for Graphviz-dependent diagrams. Rendering remains local.
- **Agent tools:** `@plantuml/mcp-js` headless engine, lazy-loaded by `uml_validate` and `uml_render`. No Java requirement.
- **Source protection:** external includes/imports rejected; maximum 100,000 source characters.
- **Browser output:** sanitize SVG, show it through an image element, and never inline untrusted rendered markup as executable DOM.
- **File edits:** the original `.puml` content is authoritative, with session-bound file routes and modification-time conflict checks.
- **Product boundary:** Markdown and unrelated text file viewers must remain untouched.

## Live acceptance checklist (pending)

These are **test targets**, not claims of verified functionality.

- [ ] Native UML Studio tab opens with Better Sidebar disabled.
- [ ] Sequence, class, component, and activity diagrams render, including Graphviz-dependent cases.
- [ ] Syntax errors appear without executing external includes.
- [ ] Opening `.puml` in Better Sidebar shows the UML viewer; regular `.md` and `.txt` files remain unchanged.
- [ ] Source, Split, Preview, zoom, pan, fit, and SVG/PNG/PUML exports work.
- [ ] File save succeeds; stale `mtime` is rejected; dirty drafts survive host changes.
- [ ] Disable/re-enable cleanly unregisters and restores native and Better Sidebar contributions.
- [ ] Agent tools produce actual diagnostics and valid SVG.
- [ ] Light and dark themes, reverse proxy, and desktop profile work.
- [ ] Cold browser-engine load time and bundling/isolation risks are measured.

## Adding real screenshots

After an end-to-end run passes in a real DSH browser session, capture the UI according to [assets/README.md](../assets/README.md). Until then, the main README deliberately avoids a fabricated product screenshot or an unverified showcase.

## Contributing

Please keep changes focused and provide reproduction steps for browser/host issues. Run `pnpm check`, document any new feature limitations, and update the live acceptance matrix when testing is actually completed.

## Proposed future phases

Diagram templates, inline Markdown PlantUML fences, richer diagnostics, and AI-assisted diagram explanations are **ideas**, not current features.
