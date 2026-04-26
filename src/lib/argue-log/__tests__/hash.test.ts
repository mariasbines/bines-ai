import { describe, it, expect } from 'vitest';
import { hashIp } from '../hash';

describe('hashIp', () => {
  it('returns a 64-char lowercase hex string', async () => {
    const out = await hashIp('1.2.3.4', 'salt-abc');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
    expect(out).toHaveLength(64);
  });

  it('is deterministic for identical inputs', async () => {
    const a = await hashIp('203.0.113.7', 'salt-x');
    const b = await hashIp('203.0.113.7', 'salt-x');
    expect(a).toBe(b);
  });

  it('produces different outputs for different salts', async () => {
    const a = await hashIp('1.2.3.4', 'saltA');
    const b = await hashIp('1.2.3.4', 'saltB');
    expect(a).not.toBe(b);
  });

  it('produces different outputs for different IPs', async () => {
    const a = await hashIp('1.2.3.4', 'saltA');
    const b = await hashIp('1.2.3.5', 'saltA');
    expect(a).not.toBe(b);
  });

  it('returns well-defined 64-char hex for empty inputs', async () => {
    const out = await hashIp('', '');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
    // SHA-256 of empty string.
    expect(out).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('concatenates salt before ip (locked order)', async () => {
    // Cross-check against a freshly computed SHA-256 of "saltip".
    // If hashIp ever swaps the order it will fail here.
    const bytes = new TextEncoder().encode('saltip');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const expected = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(await hashIp('ip', 'salt')).toBe(expected);

    // And verify "ipsalt" would produce a different digest.
    const flippedBytes = new TextEncoder().encode('ipsalt');
    const flippedDigest = await crypto.subtle.digest('SHA-256', flippedBytes);
    const flipped = Array.from(new Uint8Array(flippedDigest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(expected).not.toBe(flipped);
  });
});
