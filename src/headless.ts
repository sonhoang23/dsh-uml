/** Official PlantUML TeaVM headless engine. No Java, network or file IO. */
import { checkSource } from './safety.ts'

export interface UmlResult {
  valid: boolean
  diagramType?: string
  lineCount?: number
  errorLineNumber?: number
  errorMessage?: string
  errorLine?: string
  warnings?: string[]
  svg?: string
}

type HeadlessEngine = typeof import('@plantuml/mcp-js/engine.js')
let instancePromise: Promise<HeadlessEngine> | undefined

async function engine(): Promise<HeadlessEngine> {
  if (!instancePromise) instancePromise = (async () => {
    const viz = await import('@viz-js/viz')
    let enginePromise: ReturnType<typeof viz.instance> | undefined
    ;(globalThis as typeof globalThis & { Viz?: unknown }).Viz = {
      instance: () => (enginePromise ??= viz.instance()),
    }
    return import('@plantuml/mcp-js/engine.js')
  })().catch((error: unknown) => {
    instancePromise = undefined
    throw error
  })
  return instancePromise
}

function parseResult(json: string): UmlResult {
  const result = JSON.parse(json) as UmlResult
  if (typeof result?.valid !== 'boolean') throw new Error('PlantUML engine returned an invalid response.')
  return result
}

function preflight(source: string): UmlResult | null {
  const error = checkSource(source)
  return error ? { valid: false, errorMessage: error } : null
}

export async function validateUml(source: string): Promise<UmlResult> {
  const rejected = preflight(source)
  if (rejected) return rejected
  return parseResult((await engine()).checkSyntax(source))
}

export async function renderUml(source: string): Promise<UmlResult> {
  const rejected = preflight(source)
  if (rejected) return rejected
  const api = await engine()
  const result = await new Promise<string>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('PlantUML rendering timed out.')) }
    }, 20_000)
    try {
      api.renderSvg(source, (json) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(json)
      })
    } catch (error) {
      if (!settled) { settled = true; clearTimeout(timer); reject(error) }
    }
  })
  return parseResult(result)
}
