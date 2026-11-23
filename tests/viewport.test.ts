import { describe, expect, it } from 'vitest'
import {
  clampZoom, distance, fitZoom, midpoint, pinchTransform, zoomAt,
  type ViewTransform,
} from '../src/client/viewport.ts'

const origin: ViewTransform = { zoom: 1, pan: { x: 0, y: 0 } }

describe('mobile UML viewport geometry', () => {
  it('fits a wide diagram inside a portrait frame without cropping', () => {
    expect(fitZoom({ width: 1000, height: 500 }, { width: 360, height: 640 }, 20))
      .toBeCloseTo(0.32)
  })

  it('fits a tall diagram by height and respects padding', () => {
    expect(fitZoom({ width: 400, height: 1200 }, { width: 390, height: 600 }, 20))
      .toBeCloseTo(560 / 1200)
  })

  it('handles zero-size frames and zoom limits safely', () => {
    expect(fitZoom({ width: 400, height: 500 }, { width: 0, height: 500 })).toBe(1)
    expect(clampZoom(0)).toBe(0.02)
    expect(clampZoom(100)).toBe(8)
    expect(clampZoom(Number.NaN)).toBe(1)
  })

  it('keeps an off-center point anchored while zooming', () => {
    expect(zoomAt(origin, 2, { x: 150, y: 100 }, { width: 200, height: 200 }))
      .toEqual({ zoom: 2, pan: { x: -50, y: 0 } })
  })

  it('calculates pinch midpoint, distance, and translation', () => {
    expect(midpoint({ x: 20, y: 0 }, { x: 60, y: 40 })).toEqual({ x: 40, y: 20 })
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 30 })).toBe(30)
    expect(pinchTransform(
      origin, { x: 100, y: 100 }, { x: 110, y: 120 }, 1.5,
      { width: 200, height: 200 },
    )).toEqual({ zoom: 1.5, pan: { x: 10, y: 20 } })
  })

  it('accounts for both scale and midpoint movement around an off-center anchor', () => {
    expect(pinchTransform(
      origin, { x: 150, y: 100 }, { x: 165, y: 110 }, 2,
      { width: 200, height: 200 },
    )).toEqual({ zoom: 2, pan: { x: -35, y: 10 } })
  })
})
