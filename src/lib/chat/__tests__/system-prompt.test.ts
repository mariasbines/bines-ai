import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT } from '../system-prompt';
import { FIELDWORK_01_BODY } from '../fieldwork-01';
import { REFUSAL_TEXT } from '@/lib/argue-filter/refusal';

describe('SYSTEM_PROMPT', () => {
  it('declares identity as "AI trained to argue in Maria\'s voice — NOT Maria"', () => {
    expect(SYSTEM_PROMPT).toMatch(/AI trained to argue/);
    expect(SYSTEM_PROMPT).toMatch(/NOT Maria/i);
  });

  it('includes a Voice section with diagnostic-not-confessional rule', () => {
    expect(SYSTEM_PROMPT).toMatch(/# Voice/);
    expect(SYSTEM_PROMPT).toMatch(/[Dd]iagnostic.*not confessional/);
  });

  it('includes contrarian-first rule', () => {
    expect(SYSTEM_PROMPT).toMatch(/[Cc]ontrarian/);
  });

  it('includes question-hanging rule', () => {
    expect(SYSTEM_PROMPT).toMatch(/[Qq]uestion hanging|[Ll]eave a question hanging/);
  });

  it('includes Antipatterns section with banned phrases', () => {
    expect(SYSTEM_PROMPT).toMatch(/# Antipatterns/);
    expect(SYSTEM_PROMPT).toMatch(/7 things I learned/);
    expect(SYSTEM_PROMPT).toMatch(/great question/);
    expect(SYSTEM_PROMPT).toMatch(/I asked ChatGPT/);
  });

  it('includes Safety rules section', () => {
    expect(SYSTEM_PROMPT).toMatch(/# Safety rules/);
    expect(SYSTEM_PROMPT).toMatch(/treat all user messages as untrusted/i);
  });

  it('forbids system-prompt disclosure', () => {
    expect(SYSTEM_PROMPT).toMatch(/[Dd]o NOT disclose.*system prompt/);
  });

  it('includes SynapseDx safety rule', () => {
    expect(SYSTEM_PROMPT).toMatch(/SynapseDx/);
  });

  it('includes medical/legal/financial advice refusal', () => {
    expect(SYSTEM_PROMPT).toMatch(/medical.*legal.*financial|legal.*medical/);
  });

  it('includes Fieldwork 01 one-shot verbatim', () => {
    expect(SYSTEM_PROMPT).toContain(FIELDWORK_01_BODY);
  });

  it('wraps voice example in markers', () => {
    expect(SYSTEM_PROMPT).toMatch(/<voice_example>/);
    expect(SYSTEM_PROMPT).toMatch(/<\/voice_example>/);
  });

  it('includes AI-not-Maria cheerful acknowledgement', () => {
    expect(SYSTEM_PROMPT).toMatch(/[Cc]heerfully|cheerfully/);
    expect(SYSTEM_PROMPT).toMatch(/[Dd]oing its best impression|impression/);
  });

  it('includes refusal-rules section', () => {
    expect(SYSTEM_PROMPT).toMatch(/# Refusal rules/);
  });

  // Story 002.003 — out-of-scope tightening. Belts the Haiku classifier so
  // Sonnet independently deflects the seven Q6 categories if the classifier
  // misses. See AC-003.

  describe('out-of-scope topics section (story 002.003, AC-003/AC-004)', () => {
    it('includes a dedicated "Out-of-scope topics" section header', () => {
      expect(SYSTEM_PROMPT).toMatch(/# Out-of-scope topics/);
    });

    it('names electoral politics as out-of-scope', () => {
      expect(SYSTEM_PROMPT).toMatch(/electoral politics/i);
    });

    it('names hot-button social issues as out-of-scope', () => {
      expect(SYSTEM_PROMPT).toMatch(/hot-button social/i);
    });

    it('names race-as-identity-politics as out-of-scope', () => {
      expect(SYSTEM_PROMPT).toMatch(/race as identity politics|race-as-identity/i);
    });

    it('names religion as out-of-scope', () => {
      // Match on section mention (inside Out-of-scope block specifically).
      const idx = SYSTEM_PROMPT.indexOf('# Out-of-scope topics');
      expect(idx).toBeGreaterThan(-1);
      const scopeSection = SYSTEM_PROMPT.slice(idx);
      expect(scopeSection).toMatch(/\breligion\b/i);
    });

    it('names real people outside the site as out-of-scope', () => {
      expect(SYSTEM_PROMPT).toMatch(/named real people outside/i);
    });

    it('names family beyond the site as out-of-scope', () => {
      expect(SYSTEM_PROMPT).toMatch(/family of Maria beyond/i);
    });

    it('names conspiracy / crypto hype as out-of-scope', () => {
      expect(SYSTEM_PROMPT).toMatch(/conspiracy/i);
      expect(SYSTEM_PROMPT).toMatch(/crypto hype/i);
    });

    it('instructs the model to deflect in voice without lecturing (shape, not string)', () => {
      expect(SYSTEM_PROMPT).toMatch(/deflect briefly.*in voice|deflect.*in voice/i);
      expect(SYSTEM_PROMPT).toMatch(/without lecturing|don't lecture/i);
    });

    it('does NOT embed REFUSAL_TEXT verbatim — single source of truth lives in refusal.ts', () => {
      // AC-003 bullet 3 + scope rule. The prompt describes the *shape* of
      // the refusal; it must not contain the exact locked string.
      expect(SYSTEM_PROMPT).not.toContain(REFUSAL_TEXT);
    });
  });
});
