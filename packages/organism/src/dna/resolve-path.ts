/**
 * Resolve a dot-notation path (with optional array brackets) against an object.
 *
 * Examples:
 *   getNestedValue(obj, 'audience.primary')        → obj.audience.primary
 *   getNestedValue(obj, 'activeProjects[0].goal')   → obj.activeProjects[0].goal
 *   getNestedValue(obj, 'voice.patterns[2]')        → obj.voice.patterns[2]
 */
export function getNestedValue(obj: unknown, path: string): unknown | undefined {
  if (obj == null || !path) return undefined;

  // Parse path into segments: "foo.bar[0].baz" → ["foo", "bar", "0", "baz"]
  const segments: string[] = [];
  for (const part of path.split('.')) {
    // Handle array bracket notation: "items[0]" → ["items", "0"]
    const bracketMatch = part.match(/^([^[]*)\[(\d+)\]$/);
    if (bracketMatch) {
      if (bracketMatch[1]) segments.push(bracketMatch[1]);
      segments.push(bracketMatch[2]);
    } else {
      segments.push(part);
    }
  }

  let current: unknown = obj;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
