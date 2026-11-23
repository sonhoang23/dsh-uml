/** DSH's additionalProperties object contract requires JSON-safe dictionary output,
 * not an interface with optional fields/without an index signature. */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export function jsonObject(value: unknown): Record<string, JsonValue> {
  // Strip undefined optional UML result fields, preserving meaningful failures.
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>
}
