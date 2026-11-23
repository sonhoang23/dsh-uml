<!-- DSH UML Studio: English README. See README.vi.md for Vietnamese. -->
<div align="center">

<img src="./src/assets/icon.svg" alt="DSH UML Studio icon" width="80" height="80" />

# DSH UML Studio

**PlantUML diagrams, right inside DeepSeek Harness.**

Edit source, preview diagrams locally, and export your work without leaving DSH.

[Quick start](#quick-start) · [Features](#features) · [How it works](#how-it-works) · [Troubleshooting](docs/troubleshooting.md) · [Tiếng Việt](README.vi.md)

![Status](https://img.shields.io/badge/status-experimental-F59E0B?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-475569?style=flat-square)
![PlantUML](https://img.shields.io/badge/diagrams-PlantUML-475569?style=flat-square)
![DSH](https://img.shields.io/badge/host-DeepSeek%20Harness-475569?style=flat-square)

</div>

> [!IMPORTANT]
> **Experimental MVP — not a stable release.** Source code and regression tests are present, but end-to-end acceptance in a live DSH profile/browser is still pending. This package is currently marked `private` and is intended to be built and installed from a local checkout, not from npm.

## Why DSH UML Studio?

Turn a PlantUML file into a diagram without switching to an external editor or sending diagram source to a remote rendering service.

| Visual workflow | DSH integration |
| --- | --- |
| **Preview / Source / Split** — inspect a diagram, edit its source, or work side by side. | **Native UML Studio tab** — available in DSH's right-sidebar new-tab menu, independently of Better Sidebar. |
| **Navigate and export** — zoom, pan, fit, and download `.puml`, SVG, or PNG. | **Optional Better Sidebar viewer** — open and edit UML files directly from Files, with a dedicated tab action. |
| **Mobile-first controls (experimental)** — responsive toolbar, stacked Split mode, pinch-to-zoom, and auto-fit to the actual pane. | **Container-aware layout** — adapts to narrow DSH tabs as well as phones. |
| **Local rendering** — browser-side PlantUML TeaVM + Viz.js; no remote PlantUML server/CDN. | **Agent tools** — `uml_validate` checks PlantUML syntax, and `uml_render` generates SVG using a local headless engine. |

### Preview

This repository does **not yet** include a verified screenshot or recording of the running Studio. We won't substitute an invented UI mockup. Until live acceptance is complete, explore the actual [PlantUML example](examples/login-sequence.puml) and the source-backed workflow below. Guidance for adding real captures is in [assets/README.md](assets/README.md).

## Quick start

**Requirements**

- DeepSeek Harness (DSH) `>=0.2.2-0 <0.3.0`
- Node.js `>=24.9.0`, `pnpm`, and an existing DSH `web` profile
- Optional: Better Sidebar `0.32.1` (use DSH `0.2.2-rc.2+` within the 0.2.2 line for this integration)

**1. Clone, install, and build**

~~~bash
git clone https://github.com/sonhoang23/dsh-uml.git
cd dsh-uml
pnpm install
pnpm check
~~~

`pnpm check` runs the TypeScript check, unit tests, and build. Do not proceed with plugin installation if it fails.

**2. Register the local plugin in your DSH web profile**

~~~bash
dsh plugin --profile web add .
dsh plugin --profile web install
~~~

**3. Restart DSH Web and open the Studio**

Restart your running `dsh web` process, hard-refresh the browser, then choose **UML Studio** from the right-sidebar **new-tab** menu. Start with the built-in sample or import a local `.puml` file.

> [!TIP]
> On Windows, `Package unavailable` / `Not running` after installation usually points to profile package resolution or build setup, not to PlantUML syntax. Follow the [Windows troubleshooting guide](docs/troubleshooting.md).

## How it works

### Draw a diagram

In the native Studio, switch between **Preview**, **Source**, and **Split**. Use `+`, `−`, and **Fit** to navigate the preview; export with **PUML ↓**, **SVG ↓**, or **PNG ↓**.

~~~plantuml
@startuml
actor User
participant "DSH Agent" as Agent
participant "UML Studio" as UML

User -> Agent: Create a diagram
Agent -> UML: PlantUML source
UML --> Agent: SVG preview
Agent --> User: Diagram ready
@enduml
~~~

The native Studio can **import a local file into the browser editor** or **export the current draft**; importing is not the same as saving back to a DSH workspace file.

### Work with a file using Better Sidebar (optional)

When Better Sidebar is available, open a `.puml`, `.plantuml`, `.uml`, `.pu`, or `.wsd` file from **Files** to use the dedicated viewer/editor, or select **Mở trong UML Studio** to open a dedicated tab.

File-backed editing uses authenticated, session-scoped file routes, tracks unsaved changes, and checks the source file's modification time before saving to reduce overwrite conflicts. Ordinary Markdown and text files keep their existing viewers.

### Use the agent tools

| Tool | Purpose |
| --- | --- |
| `uml_validate` | Validate PlantUML source and return diagnostics (such as syntax errors). |
| `uml_render` | Render PlantUML source into SVG returned to the agent. |

Both tools use the official headless TeaVM PlantUML engine without requiring Java. DSH can create and save `.puml` files through its normal file tools; these UML tools do **not** write files themselves.

## Architecture

~~~mermaid
flowchart TB
    DSH["DeepSeek Harness"]
    UI["dsh-uml browser client"]
    Native["Native right-sidebar UML Studio"]
    Better["Better Sidebar adapter (optional)"]
    Browser["Local PlantUML TeaVM + Viz.js"]
    Files["Session-scoped file read/write"]
    Agent["DSH agent tools"]
    Headless["Headless PlantUML TeaVM"]

    DSH --> UI
    UI --> Native
    UI -.-> Better
    Native --> Browser
    Better --> Browser
    Better --> Files
    DSH --> Agent
    Agent --> Headless
~~~

- The plugin uses DSH's native sidebar extension points; it does **not** patch DSH core or modify Better Sidebar's source.
- Browser rendering happens locally. The `.puml` file remains the source of truth for file-backed editing.
- Browser SVG is sanitized and displayed as an image rather than injected as executable inline markup.

## Status and limitations

- **Experimental:** live DSH/browser acceptance remains pending; see the [development checklist](docs/development.md).
- **Security boundary:** external `!include`, `!includeurl`, `!include_sprites`, and `!import` directives are blocked. PlantUML source is limited to **100,000 characters**.
- **Scope:** one diagram per file is the intended MVP workflow. Cold browser-engine load and isolation still need evaluation before release.
- **Roadmap ideas (not shipped):** diagram templates, PlantUML blocks inside Markdown, richer syntax diagnostics, and AI-assisted explanations.

### Mobile experience (experimental)

The Studio adapts to the **actual DSH pane width**, not only the device viewport. Narrow layouts default to Preview, stack Split vertically, and provide larger touch controls and pinch-to-zoom. Mobile acceptance on physical devices is still pending; see the [mobile test matrix](docs/mobile-qa.md).

## Documentation

- [Troubleshooting](docs/troubleshooting.md) — version/profile checks and Windows `Package unavailable` recovery
- [Development and acceptance](docs/development.md) — architecture notes, build commands, and live testing checklist
- [Real screenshot guidelines](assets/README.md) — how to add verified product imagery
- [Vietnamese README](README.vi.md) — hướng dẫn bằng tiếng Việt

## Contributing

Issues, reproducible bug reports, and focused pull requests are welcome. Please describe your DSH and Node versions, whether Better Sidebar is enabled, and the steps needed to reproduce the problem. Run `pnpm check` before submitting a code change; see [development notes](docs/development.md).

## License

Released under the [MIT License](LICENSE). Built on the official PlantUML TeaVM engine and the DSH extension APIs.
