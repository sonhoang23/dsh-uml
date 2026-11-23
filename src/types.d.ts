declare module '@plantuml/mcp-js/engine.js' {
  export function checkSyntax(source: string): string
  export function renderSvg(source: string, done: (result: string) => void): void
}
declare module '@plantuml/core/plantuml.js' {
  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
  ): void
}
