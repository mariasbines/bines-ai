/**
 * Salted SHA-256 of an IP address, returned as 64-char lowercase hex.
 *
 * Concatenation order is `salt + ip` — locked so salt rotation can't
 * accidentally invert. Uses Web Crypto `crypto.subtle` for Edge runtime
 * compatibility (no Node-only APIs).
 *
 * Pure function: no env reads here. The caller (edge route) is responsible
 * for reading the active salt and passing it in. This keeps env access
 * concentrated at the route boundary and makes this module trivially testable.
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(salt + ip);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
