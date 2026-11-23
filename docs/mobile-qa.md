# Mobile UX v1 — acceptance guide

[← README](../README.md) · [Development](development.md)

This is a manual acceptance checklist for the **experimental** mobile-first Studio. It supplements the automated viewport geometry tests in `tests/viewport.test.ts`; the presence of this guide does not mean physical-device validation has already passed.

## Layout and navigation

Test the native UML Studio **and** the optional Better Sidebar file viewer, wherever available.

| Viewport/container | Expected result |
| --- | --- |
| Narrow pane (280–340 px) | Mode selector stays reachable, with other primary actions wrapping as needed |
| Phone portrait (360 / 390 / 430 px) | **Preview** selected by default; toolbar does not overflow |
| Phone landscape (e.g., 667 × 375) | Responsive behavior follows actual **pane width**, not only device width |
| Tablet / medium pane (560–768 px) | Native or Better Sidebar content fits available pane without clipping |
| Desktop wide pane | Original desktop Source/Split workflow and full toolbar are retained |

- [ ] The Preview, Source, and Split buttons are usable without horizontal page scrolling.
- [ ] In a narrow pane, **Split** stacks the editor above the preview instead of squeezing both side by side.
- [ ] **Save** remains visible for file-backed editing; **More** exposes import/reload and exports.
- [ ] **Source** editor has readable text and is still usable with the mobile virtual keyboard.
- [ ] Responsive layout reacts to pane resizing, orientation changes, and Better Sidebar width changes.
- [ ] Switching modes never silently overwrites or discards a dirty draft.

## Diagram gestures

Use [examples/login-sequence.puml](../examples/login-sequence.puml) and at least one large, wide diagram.

- [ ] Opening a diagram fits it within the actual preview width/height (including after rotating or resizing).
- [ ] Dragging with **one finger** pans the diagram without jumping.
- [ ] Moving **two fingers** pans and pinches the diagram around the gesture midpoint.
- [ ] Releasing one finger after pinching transitions smoothly back to panning.
- [ ] **+ / − / Fit** buttons remain reachable and respond to touch targets at least 44 px high.
- [ ] Fit resets pan and zoom to show the diagram; manual zoom stays stable until the next Fit.
- [ ] On desktop, drag-to-pan and toolbar controls continue working; keyboard arrows, +/- and 0 are also available when the preview is focused.
- [ ] Disabling/re-enabling the plugin or switching files does not leave stale gestures active.

## Rendering, editing and exports

- [ ] The first render completes or shows an actionable error; the UI remains responsive during source editing and gestures.
- [ ] A syntax error is surfaced clearly and recovers after correcting the PlantUML source.
- [ ] Loading a new file refits the new diagram after it renders.
- [ ] PUML, SVG and PNG exports work in browsers that support downloads.
- [ ] Better Sidebar file save still guards against stale modification-time conflicts.
- [ ] Ordinary Markdown/text viewers are unaffected.
- [ ] Both DSH light/dark themes remain legible; verify actual SVG readability rather than recoloring screenshots.

## Devices and performance measurements

At minimum, test **Android Chrome** and **iOS Safari** on physical devices when available, plus responsive desktop emulation at 360, 390, 430, and 768 CSS pixels.

Record the device/browser, actual pane width, diagram size, first-render time, interaction smoothness, and any failures. Rendering currently uses the browser main thread; moving the PlantUML engine into a worker is a potential follow-up **only after measuring** load/render bottlenecks and checking bundler compatibility.

## Automated checks

Run:

```bash
pnpm check
```

This validates types, unit tests (including viewport math), and build output. It does **not** replace real touch-device acceptance or verify the runtime DSH host integration.
