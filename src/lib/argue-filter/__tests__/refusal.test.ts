import { describe, it, expect } from 'vitest';
import {
  REFUSAL_TEXT,
  HARM_REFUSAL_DEFAULT,
  HARM_REFUSAL_SELF_HARM,
  refusalStream,
  refusalTextFor,
} from '../refusal';
import type { ArgueVerdict } from '@/lib/argue-log/schema';

const EXPECTED =
  "not my lane — maria doesn't have a public position on this, and i don't invent them. what else have you got?";

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const after = await reader.read();
  expect(after.done).toBe(true);

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(merged);
}

describe('REFUSAL_TEXT', () => {
  it('is the exact locked off-brand string', () => {
    expect(REFUSAL_TEXT).toBe(EXPECTED);
  });

  it('starts lowercase', () => {
    expect(REFUSAL_TEXT.charAt(0)).toBe(REFUSAL_TEXT.charAt(0).toLowerCase());
    expect(REFUSAL_TEXT.charAt(0)).not.toBe(
      REFUSAL_TEXT.charAt(0).toUpperCase(),
    );
  });
});

describe('HARM_REFUSAL_DEFAULT and HARM_REFUSAL_SELF_HARM', () => {
  it('default harm refusal starts lowercase', () => {
    expect(HARM_REFUSAL_DEFAULT.charAt(0)).toBe(
      HARM_REFUSAL_DEFAULT.charAt(0).toLowerCase(),
    );
  });

  it('self-harm refusal points at samaritans', () => {
    expect(HARM_REFUSAL_SELF_HARM).toMatch(/samaritans/i);
    expect(HARM_REFUSAL_SELF_HARM).toMatch(/116 123/);
  });

  it('self-harm refusal starts lowercase', () => {
    expect(HARM_REFUSAL_SELF_HARM.charAt(0)).toBe(
      HARM_REFUSAL_SELF_HARM.charAt(0).toLowerCase(),
    );
  });
});

describe('refusalTextFor()', () => {
  function v(partial: Partial<ArgueVerdict> = {}): ArgueVerdict {
    return { harm: 'none', off_brand: [], ...partial };
  }

  it('returns null on a clean verdict', () => {
    expect(refusalTextFor(v())).toBeNull();
  });

  it('returns REFUSAL_TEXT on any off-brand category', () => {
    expect(refusalTextFor(v({ off_brand: ['electoral_politics'] }))).toBe(REFUSAL_TEXT);
    expect(refusalTextFor(v({ off_brand: ['religion'] }))).toBe(REFUSAL_TEXT);
  });

  it('returns the self-harm refusal when harm is self_harm', () => {
    expect(refusalTextFor(v({ harm: 'self_harm' }))).toBe(HARM_REFUSAL_SELF_HARM);
  });

  it('returns the default harm refusal for hate/threat/sexual/violence', () => {
    expect(refusalTextFor(v({ harm: 'hate' }))).toBe(HARM_REFUSAL_DEFAULT);
    expect(refusalTextFor(v({ harm: 'threat' }))).toBe(HARM_REFUSAL_DEFAULT);
    expect(refusalTextFor(v({ harm: 'sexual' }))).toBe(HARM_REFUSAL_DEFAULT);
    expect(refusalTextFor(v({ harm: 'violence' }))).toBe(HARM_REFUSAL_DEFAULT);
  });

  it('off-brand wins over harm in copy selection', () => {
    expect(
      refusalTextFor(v({ harm: 'hate', off_brand: ['religion'] })),
    ).toBe(REFUSAL_TEXT);
  });
});

describe('refusalStream()', () => {
  it('emits REFUSAL_TEXT by default', async () => {
    expect(await drainStream(refusalStream())).toBe(REFUSAL_TEXT);
  });

  it('emits the supplied text verbatim', async () => {
    const custom = 'no. wrong house for that one. try elsewhere.';
    expect(await drainStream(refusalStream(custom))).toBe(custom);
  });

  it('contains no framing', async () => {
    const body = await drainStream(refusalStream());
    expect(body).not.toMatch(/^data: /);
    expect(body).not.toMatch(/"type":/);
  });

  it('closes cleanly', async () => {
    await drainStream(refusalStream());
  });
});
