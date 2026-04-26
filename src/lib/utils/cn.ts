type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: unknown }
  | ClassValue[];

/**
 * Join class names conditionally. Zero dependencies.
 * Accepts strings, arrays, and `{ class: boolean }` objects.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else if (typeof input === 'object') {
      for (const key in input) {
        if ((input as Record<string, unknown>)[key]) out.push(key);
      }
    }
  }
  return out.join(' ');
}
