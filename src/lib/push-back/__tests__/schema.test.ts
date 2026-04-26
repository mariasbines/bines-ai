import { describe, it, expect } from 'vitest';
import { PUSH_BACK } from '../schema';

const VALID = {
  slug: '01-best-thing',
  message: 'This is a valid pushback of more than ten characters.',
  name: 'Anon',
};

describe('PUSH_BACK schema', () => {
  it('accepts a valid submission', () => {
    expect(PUSH_BACK.safeParse(VALID).success).toBe(true);
  });
  it('accepts when name is absent', () => {
    const { name: _unused, ...rest } = VALID;
    void _unused;
    expect(PUSH_BACK.safeParse(rest).success).toBe(true);
  });
  it('accepts when name is empty string', () => {
    expect(PUSH_BACK.safeParse({ ...VALID, name: '' }).success).toBe(true);
  });
  it('rejects short message (<10 chars)', () => {
    const r = PUSH_BACK.safeParse({ ...VALID, message: 'too short' });
    expect(r.success).toBe(false);
  });
  it('rejects long message (>2000 chars)', () => {
    const r = PUSH_BACK.safeParse({ ...VALID, message: 'x'.repeat(2001) });
    expect(r.success).toBe(false);
  });
  it('rejects non-empty honeypot (website field)', () => {
    const r = PUSH_BACK.safeParse({ ...VALID, website: 'http://spammer.example' });
    expect(r.success).toBe(false);
  });
  it('accepts missing honeypot', () => {
    expect(PUSH_BACK.safeParse(VALID).success).toBe(true);
  });
  it('accepts empty honeypot explicitly', () => {
    expect(PUSH_BACK.safeParse({ ...VALID, website: '' }).success).toBe(true);
  });
  it('rejects missing slug', () => {
    const { slug: _unused, ...rest } = VALID;
    void _unused;
    const r = PUSH_BACK.safeParse(rest);
    expect(r.success).toBe(false);
  });
});
