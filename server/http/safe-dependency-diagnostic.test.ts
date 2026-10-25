import assert from 'node:assert/strict';
import test from 'node:test';
import { safeDependencyDiagnostic } from './safe-dependency-diagnostic.ts';

test('safe diagnostics expose broker DNS failure codes without exposing hostnames', () => {
  const dnsCause = Object.assign(
    new Error('getaddrinfo ENOTFOUND private-broker.example'),
    { code: 'ENOTFOUND', syscall: 'getaddrinfo', hostname: 'private-broker.example' },
  );
  const fetchFailure = Object.assign(new TypeError('fetch failed'), { cause: dnsCause });
  const brokerFailure = Object.assign(
    new Error('Production database broker request failed.'),
    { stage: 'broker_fetch', cause: fetchFailure },
  );

  const diagnostic = safeDependencyDiagnostic(brokerFailure);
  assert.deepEqual(diagnostic, {
    name: 'Error',
    code: 'ENOTFOUND',
    syscall: 'getaddrinfo',
    stage: 'broker_fetch',
  });
  assert.equal(JSON.stringify(diagnostic).includes('private-broker.example'), false);
});

test('safe diagnostics allowlist broker status and stage fields', () => {
  const brokerFailure = Object.assign(
    new Error('response body must not be logged'),
    { stage: 'broker_http', brokerStatus: 503, code: 'bad code', syscall: 'exec' },
  );

  assert.deepEqual(safeDependencyDiagnostic(brokerFailure), {
    name: 'Error',
    stage: 'broker_http',
    brokerStatus: 503,
  });
});
