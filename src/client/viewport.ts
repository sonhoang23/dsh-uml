/** Browser-independent viewport geometry for mouse and touch navigation. */
export interface Point { x: number; y: number }
export interface Dimensions { width: number; height: number }
export interface ViewTransform { zoom: number; pan: Point }

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 8

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
}

/** Scale the whole image into the available frame, including a little breathing room. */
export function fitZoom(image: Dimensions, frame: Dimensions, padding = 16): number {
  if (![image.width, image.height, frame.width, frame.height].every(Number.isFinite) ||
      image.width <= 0 || image.height <= 0 || frame.width <= 0 || frame.height <= 0) return 1
  const innerWidth = Math.max(1, frame.width - 2 * padding)
  const innerHeight = Math.max(1, frame.height - 2 * padding)
  return clampZoom(Math.min(innerWidth / image.width, innerHeight / image.height))
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Keep the diagram point under the gesture anchor stationary when the scale changes. */
export function zoomAt(
  view: ViewTransform,
  targetZoom: number,
  anchor: Point,
  frame: Dimensions,
): ViewTransform {
  const nextZoom = clampZoom(targetZoom)
  const ratio = nextZoom / (view.zoom > 0 ? view.zoom : 1)
  const dx = anchor.x - frame.width / 2
  const dy = anchor.y - frame.height / 2
  return {
    zoom: nextZoom,
    pan: {
      x: dx - (dx - view.pan.x) * ratio,
      y: dy - (dy - view.pan.y) * ratio,
    },
  }
}

/** Two-finger pinch, including translation of the midpoint, without jumping. */
export function pinchTransform(
  view: ViewTransform,
  previousCenter: Point,
  nextCenter: Point,
  scaleFactor: number,
  frame: Dimensions,
): ViewTransform {
  const next = zoomAt(view, view.zoom * scaleFactor, previousCenter, frame)
  return {
    zoom: next.zoom,
    pan: {
      x: next.pan.x + nextCenter.x - previousCenter.x,
      y: next.pan.y + nextCenter.y - previousCenter.y,
    },
  }
}
