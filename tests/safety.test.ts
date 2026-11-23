import { describe, expect, it } from 'vitest'
import { checkSource, isUmlFile } from '../src/safety.ts'

const ok = '@startuml\nAlice -> Bob : Hello\n@enduml'
describe('PlantUML boundaries', () => {
  it('accepts diagram source and case-insensitive extension', () => {
    expect(checkSource(ok)).toBeNull()
    expect(isUmlFile('diagrams/flow.PUML')).toBe(true)
    expect(isUmlFile('notes.md')).toBe(false)
    expect(isUmlFile('something.puml.bak')).toBe(false)
  })
  it('rejects mismatched markers and empty source', () => {
    expect(checkSource('')).toContain('empty')
    expect(checkSource('@startuml\nA -> B')).toContain('matching')
    expect(checkSource('@startuml\n@endmindmap')).toContain('matching')
  })
  it('rejects local/remote includes and excessively large text', () => {
    expect(checkSource('@startuml\n!includeurl https://x\n@enduml')).toContain('disabled')
    expect(checkSource('@startuml\n!include local.puml\n@enduml')).toContain('disabled')
    expect(checkSource(ok + ' '.repeat(100_001))).toContain('exceeds')
  })
})
