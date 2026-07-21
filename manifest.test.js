import { describe, it, expect } from 'vitest';
import manifest from './manifest.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

describe('manifest.json', () => {
  it('version stays in sync with package.json (release.yml only checks tag vs manifest.json)', () => {
    expect(manifest.version).toBe(pkg.version);
  });
});
