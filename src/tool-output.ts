/** JSON-safe dictionary conversion for DSH tool outputs. */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/** Strip undefined optional result fields while preserving meaningful failures. */
export function jsonObject(value: unknown): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>
}
