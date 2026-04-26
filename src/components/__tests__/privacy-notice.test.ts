import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

describe('privacy disclosure consistency (AC-003 / ARGUE-PRV-002)', () => {
  it('no source file under chat surfaces claims "not stored"', () => {
    const cmd = [
      'git',
      'grep',
      '-iE',
      '"not stored|conversation is not stored"',
      '--',
      'src/app/argue',
      'src/components/ChatInterface.tsx',
      'src/components/Chat*',
      'src/lib/chat',
      'src/lib/argue-filter',
    ].join(' ');

    let output = '';
    try {
      output = execSync(cmd, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: Buffer };
      if (e.status === 1) output = '';
      else throw err;
    }

    expect(output.trim()).toBe('');
  });
});
