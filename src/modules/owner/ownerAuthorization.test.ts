import assert from 'node:assert/strict';
import test from 'node:test';
import { isAuthorizedOwnerAccount, OWNER_ACCOUNT_EMAIL } from './ownerAuthorization';

test('allows only the designated owner email with the owner database role', () => {
  assert.equal(isAuthorizedOwnerAccount(OWNER_ACCOUNT_EMAIL, 'owner'), true);
  assert.equal(isAuthorizedOwnerAccount(' PRODX.OWNER@GMAIL.COM ', 'owner'), true);
});

test('denies other emails even if they have an owner/admin role', () => {
  assert.equal(isAuthorizedOwnerAccount('b.b.thodsawat@gmail.com', 'owner'), false);
  assert.equal(isAuthorizedOwnerAccount('someone@example.com', 'admin'), false);
});

test('denies the designated email without the exact owner role', () => {
  for (const role of ['admin', 'manager', 'cashier', 'user', '', null, undefined, 1, { role: 'owner' }]) {
    assert.equal(isAuthorizedOwnerAccount(OWNER_ACCOUNT_EMAIL, role), false, `expected role ${String(role)} to be denied`);
  }
});

test('denies missing, malformed, and non-string email values', () => {
  for (const email of ['', 'prodx.owner@gmail.com.attacker.test', null, undefined, 1, { email: OWNER_ACCOUNT_EMAIL }]) {
    assert.equal(isAuthorizedOwnerAccount(email, 'owner'), false, `expected email ${String(email)} to be denied`);
  }
});
