import { describe, it, expect } from 'vitest';
import { newConversationId } from '../id';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newConversationId', () => {
  it('returns a string matching the canonical UUID v4 shape', () => {
    expect(newConversationId()).toMatch(UUID_V4_RE);
  });

  it('returns distinct values across multiple calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newConversationId());
    expect(ids.size).toBe(50);
  });

  it('is exported as a named export (not default)', async () => {
    const mod = await import('../id');
    expect(typeof mod.newConversationId).toBe('function');
    expect((mod as { default?: unknown }).default).toBeUndefined();
  });
});
