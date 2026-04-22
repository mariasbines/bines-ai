import { describe, it, expect } from 'vitest';
import { errorMessageFor } from '../error-messages';

describe('errorMessageFor', () => {
  it('returns voice-appropriate rate-limited copy', () => {
    const msg = errorMessageFor('rate-limited');
    expect(msg).toMatch(/ease up/i);
  });
  it('returns voice-appropriate upstream copy', () => {
    const msg = errorMessageFor('upstream');
    expect(msg).toMatch(/Claude/);
    expect(msg).toMatch(/moment/);
  });
  it('returns voice-appropriate network copy', () => {
    const msg = errorMessageFor('network');
    expect(msg).toMatch(/try once more/);
  });
});
