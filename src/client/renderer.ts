import { checkSource } from '../safety.ts'

let enginePromise: Promise<typeof import('@plantuml/core/plantuml.js')> | undefined

async function getEngine(): Promise<typeof import('@plantuml/core/plantuml.js')> {
  if (!enginePromise) enginePromise = (async () => {
    const viz = await import('@viz-js/viz')
    let instancePromise: ReturnType<typeof viz.instance> | undefined
    ;(globalThis as typeof globalThis & { Viz?: unknown }).Viz = {
      instance: () => (instancePromise ??= viz.instance()),
    }
    return import('@plantuml/core/plantuml.js')
  })().catch((error: unknown) => {
    enginePromise = undefined
    throw error
  })
  return enginePromise
}

/** Render client-side, with no server/CDN and with external includes denied. */
export async function renderBrowser(source: string): Promise<string> {
  const reason = checkSource(source)
  if (reason) throw new Error(reason)
  const engine = await getEngine()
  const svg = await new Promise<string>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('PlantUML rendering timed out.')) }
    }, 20_000)
    try {
      engine.renderToString(source.split(/\r\n?|\n/), (result) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }, (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(new Error(error))
      })
    } catch (error) {
      if (!settled) { settled = true; clearTimeout(timer); reject(error) }
    }
  })
  return sanitizeSvg(svg)
}

/** Only safe static SVG is ever put in an <img> or downloaded. */
export function sanitizeSvg(raw: string): string {
  const documentSvg = new DOMParser().parseFromString(raw, 'image/svg+xml')
  const root = documentSvg.documentElement
  if (root.localName !== 'svg' || documentSvg.querySelector('parsererror'))
    throw new Error('PlantUML returned invalid SVG.')
  const blocked = 'script,foreignObject,iframe,object,embed,image,use,a,animate,animateMotion,animateTransform,set,style'
  for (const element of Array.from(root.querySelectorAll(blocked))) element.remove()
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value
      if (/^on/.test(name) || name === 'href' || name === 'xlink:href' ||
          name === 'style' || /url\s*\(/i.test(value) || /javascript:/i.test(value)) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(root)
}

export function svgDimensions(svg: string): { width: number; height: number } {
  const documentSvg = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = documentSvg.documentElement
  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
  const rawWidth = Number.parseFloat(root.getAttribute('width') ?? '')
  const rawHeight = Number.parseFloat(root.getAttribute('height') ?? '')
  const width = viewBox?.length === 4 && (viewBox[2] ?? 0) > 0 ? viewBox[2]! : rawWidth
  const height = viewBox?.length === 4 && (viewBox[3] ?? 0) > 0 ? viewBox[3]! : rawHeight
  return {
    width: Math.min(4096, Math.max(1, Number.isFinite(width) ? width : 960)),
    height: Math.min(4096, Math.max(1, Number.isFinite(height) ? height : 540)),
  }
}
