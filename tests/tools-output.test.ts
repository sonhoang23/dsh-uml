import { describe, expect, it } from 'vitest'
import { jsonObject } from '../src/json.ts'

describe('DSH UML tool output', () => {
  it('preserves valid SVG as a JSON-compatible dictionary', () => {
    expect(jsonObject({
      valid: true,
      diagramType: 'SEQUENCE',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      errorMessage: undefined,
    })).toEqual({
      valid: true,
      diagramType: 'SEQUENCE',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
  })

  it('preserves errors without undefined optional properties', () => {
    expect(jsonObject({ valid: false, errorLineNumber: 3, errorMessage: 'Syntax error' }))
      .toEqual({ valid: false, errorLineNumber: 3, errorMessage: 'Syntax error' })
  })
})
