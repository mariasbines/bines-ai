/** Zero-pad a positive integer to at least 3 digits. */
export function padNumber(n: number, width: number = 3): string {
  return n.toString().padStart(width, '0');
}
