import assert from 'node:assert/strict';
import test from 'node:test';
import { isOwnerRole } from './ownerAuthorization';

test('allows only owner and admin database roles', () => {
  assert.equal(isOwnerRole('owner'), true);
  assert.equal(isOwnerRole('admin'), true);
});

test('denies staff, unknown, and missing roles by default', () => {
  for (const role of ['manager', 'cashier', 'user', '', null, undefined, 1, { role: 'owner' }]) {
    assert.equal(isOwnerRole(role), false, `expected ${String(role)} to be denied`);
  }
});
