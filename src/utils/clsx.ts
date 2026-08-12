/**
 * Minimal clsx-like class name utility.
 * Supports string, falsy, and object/map syntax.
 */
type ClassValue =
  | string
  | false
  | undefined
  | null
  | 0
  | { [key: string]: boolean | undefined | null };

export function clsx(...classes: ClassValue[]): string {
  const parts: string[] = [];
  for (const cls of classes) {
    if (!cls) continue;
    if (typeof cls === 'string') {
      parts.push(cls);
    } else if (typeof cls === 'object') {
      for (const [key, val] of Object.entries(cls)) {
        if (val) parts.push(key);
      }
    }
  }
  return parts.join(' ');
}
