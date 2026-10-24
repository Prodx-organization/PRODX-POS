import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Admin login does not embed credentials or send credential data to diagnostic logs', async () => {
  const source = await readFile(new URL('./AdminLoginScreen.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /passwordOrPin\s*:\s*['"`][^'"`]+['"`]/);
  assert.doesNotMatch(source, /setPassword\(\s*['"`][^'"`]+['"`]\s*\)/);
  assert.doesNotMatch(source, /Default Owner Credential Fill/);
  assert.doesNotMatch(source, /traceAdminLoginLifecycle\(\s*['"](?:SUBMIT|SUCCESS)['"]\s*,\s*\{[^}]*\b(?:identity|secret|password|user)\b/s);
  assert.doesNotMatch(source, /\.\.\.data/);
});

test('legacy Admin login does not advertise an OAuth flow without a server-side token exchange', async () => {
  const source = await readFile(new URL('./AdminLoginScreen.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /GoogleAuthProvider|signInWithPopup|handleAdminGoogleSignIn/);
});
