/** No filesystem/network includes in the experimental UML Studio. */
export const MAX_SOURCE_CHARS = 100_000

export function checkSource(source: string): string | null {
  if (!source.trim()) return 'PlantUML source is empty.'
  if (source.length > MAX_SOURCE_CHARS) return 'PlantUML source exceeds 100,000 characters.'
  if (/(?:^|\n)\s*!(?:include(?:url|many|once)?|import|include_sprites)\b/i.test(source))
    return 'External includes and imports are disabled in dsh-uml.'
  const start = source.match(/^\s*@start([a-z]+)\b/im)
  if (!start) return 'Missing @startuml (or another @start... marker).'
  const end = new RegExp('^\\s*@end' + start[1] + '\\b', 'im')
  if (!end.test(source)) return 'Missing matching @end' + start[1] + ' marker.'
  return null
}

export function isUmlFile(path: string): boolean {
  return /\.(?:puml|plantuml|uml|pu|wsd)$/i.test(path)
}
