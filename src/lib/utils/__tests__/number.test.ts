import { describe, it, expect } from 'vitest';
import { padNumber } from '../number';

describe('padNumber', () => {
  it('zero-pads to 3 digits by default', () => {
    expect(padNumber(1)).toBe('001');
    expect(padNumber(47)).toBe('047');
    expect(padNumber(100)).toBe('100');
  });
  it('does not truncate numbers with more digits than the width', () => {
    expect(padNumber(1000)).toBe('1000');
  });
  it('respects custom width', () => {
    expect(padNumber(5, 2)).toBe('05');
  });
});
