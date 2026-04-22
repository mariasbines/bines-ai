import { describe, it, expect } from 'vitest';
import { validateRequest, MAX_MESSAGE_CHARS, MAX_TURNS } from '../validate';

describe('validateRequest', () => {
  it('accepts a minimal valid request', () => {
    const r = validateRequest({ messages: [{ role: 'user', content: 'hi' }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.messages).toHaveLength(1);
  });

  it('rejects missing messages field with 400', () => {
    const r = validateRequest({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.category).toBe('input');
    }
  });

  it('rejects empty messages array with 400', () => {
    const r = validateRequest({ messages: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it('rejects unknown role with 400', () => {
    const r = validateRequest({
      messages: [{ role: 'system', content: 'hi' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it('rejects over-length content with 413', () => {
    const r = validateRequest({
      messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
  });

  it('accepts exactly MAX_MESSAGE_CHARS content', () => {
    const r = validateRequest({
      messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS) }],
    });
    expect(r.ok).toBe(true);
  });

  it('truncates to the last MAX_TURNS messages', () => {
    const messages = Array.from({ length: MAX_TURNS + 5 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg ${i}`,
    }));
    const r = validateRequest({ messages });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.messages).toHaveLength(MAX_TURNS);
      // Should keep the LAST MAX_TURNS; oldest truncated
      expect(r.messages[0].content).toBe(`msg ${5}`);
      expect(r.messages[r.messages.length - 1].content).toBe(`msg ${MAX_TURNS + 4}`);
    }
  });

  it('rejects empty content with 400', () => {
    const r = validateRequest({ messages: [{ role: 'user', content: '' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});
