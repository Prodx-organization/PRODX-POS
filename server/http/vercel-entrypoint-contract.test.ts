import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiEntry = await readFile(new URL('../../api/index.ts', import.meta.url), 'utf8');
const productionEntry = await readFile(new URL('../entrypoint.ts', import.meta.url), 'utf8');
const bundleDeclaration = await readFile(new URL('../../server-bundle.d.ts', import.meta.url), 'utf8');

test('Vercel API entrypoint imports runtime helpers from the bundled server artifact', () => {
  assert.match(
    apiEntry,
    /import \{ createProductionApp, createRetryableInitialization \} from ['"]\.\.\/server-bundle\.js['"]/,
  );
  assert.doesNotMatch(apiEntry, /from ['"]\.\.\/server\/.*\.ts['"]/);
  assert.match(
    productionEntry,
    /export \{ createRetryableInitialization \} from ['"]\.\/http\/retryable-initialization\.ts['"]/,
  );
  assert.match(bundleDeclaration, /export declare const createRetryableInitialization:/);
});

test('Vercel database broker authentication uses the trusted runtime OIDC token, not request headers', () => {
  assert.match(apiEntry, /vercelOidcToken:\s*process\.env\.VERCEL_OIDC_TOKEN/);
  assert.doesNotMatch(apiEntry, /x-vercel-oidc-token/i);
  assert.doesNotMatch(apiEntry, /getVercelOidcToken/);
});
