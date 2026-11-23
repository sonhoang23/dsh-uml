# Product media

[← README](../README.md) · [README tiếng Việt](../README.vi.md)

This folder is reserved for **real, verified screenshots and short recordings** of DSH UML Studio. No UI mockup or conceptual diagram should be presented as a product screenshot.

## Capture checklist

Capture media only after you have launched a local DSH `web` profile with `dsh-uml` installed and verified the UI in the browser.

| Suggested file | What to capture |
| --- | --- |
| `studio-split.png` | Native UML Studio in **Split** mode, with source and actual rendered diagram both legible |
| `studio-preview.png` | Actual **Preview** mode, showing the diagram and toolbar |
| `better-sidebar-file.png` | An opened `.puml` file from Better Sidebar (only if that integration is installed and working) |
| `studio-demo.gif` | Optional short recording: edit source, preview update, then export |

Use the sample file at [`examples/login-sequence.puml`](../examples/login-sequence.puml) when possible. Keep the real DSH UI visible; crop irrelevant browser chrome, but do not reconstruct or alter controls. Hide private paths, tokens, usernames, and session data.

## Presentation guidelines

- Prefer a clean 16:9 or wide crop at readable desktop resolution (e.g., 1440 × 900). Avoid blurry scaled text.
- Capture both light and dark themes **only after validating them**; do not claim a theme is supported just because a screenshot has been recolored.
- Optimize PNG/GIF size; include descriptive alt text when adding images to the README.
- Do not add empty image references to README before the files exist.

When `studio-split.png` is available and verified, place it near the top of the English and Vietnamese README files with a descriptive caption. Until then, both READMEs deliberately link to the real PlantUML example instead.
