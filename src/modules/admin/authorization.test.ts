import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdminRole } from './authorization';

test('owner and admin can enter the administration portal', () => {
  assert.equal(isAdminRole('owner'), true);
  assert.equal(isAdminRole('admin'), true);
});

test('non-admin roles cannot enter the administration portal', () => {
  assert.equal(isAdminRole('manager'), false);
  assert.equal(isAdminRole('cashier'), false);
});

test('missing, malformed, and unknown roles fail closed', () => {
  assert.equal(isAdminRole(null), false);
  assert.equal(isAdminRole(undefined), false);
  assert.equal(isAdminRole('Owner'), false);
  assert.equal(isAdminRole('superadmin'), false);
  assert.equal(isAdminRole({ role: 'owner' }), false);
});
