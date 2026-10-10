import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../../../vercel.json', import.meta.url));
const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
  rewrites: Array<{ source: string; destination: string }>;
};

test('API rewrites precede the SPA fallback', () => {
  const apiIndex = config.rewrites.findIndex((rewrite) => rewrite.source === '/api/:path*' && rewrite.destination === '/api/index.ts');
  const authIndex = config.rewrites.findIndex((rewrite) => rewrite.source === '/auth/:path*' && rewrite.destination === '/api/index.ts');
  const organizationsIndex = config.rewrites.findIndex((rewrite) => rewrite.source === '/organizations/:path*' && rewrite.destination === '/api/index.ts');
  const fallbackIndex = config.rewrites.findIndex((rewrite) => rewrite.source === '/(.*)' && rewrite.destination === '/index.html');

  assert.ok(apiIndex >= 0, 'API rewrite must remain configured');
  assert.ok(authIndex > apiIndex, 'auth rewrite must remain configured after API rewrite');
  assert.ok(organizationsIndex > authIndex, 'organization rewrite must remain configured');
  assert.equal(fallbackIndex, config.rewrites.length - 1, 'SPA fallback must be last so API routes retain priority');
});
