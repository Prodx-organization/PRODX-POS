import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_STAFF_DIRECTORY } from '../src/domain/auth';
import { MockAuthApi } from '../src/adapters/mockAdapter';

const api = new MockAuthApi();
const baseRequest = {
  organizationSlug: 'prodx',
  storeCode: 'STR-01',
  registerId: 'REG-01',
};

test('rejects an unknown email instead of authenticating the first staff member', async () => {
  await assert.rejects(
    api.login({ ...baseRequest, emailOrPin: 'never-registered@example.invalid', passwordOrPin: 'Fresh-Password-908!' }),
    /Invalid email or password/,
  );
});

test('rejects guest aliases instead of creating a guest session', async () => {
  for (const identity of ['guest', 'GUEST-POS']) {
    await assert.rejects(
      api.login({ ...baseRequest, emailOrPin: identity, passwordOrPin: 'anything-nonempty' }),
      /Invalid email or password/,
    );
  }
});

test('does not bypass password validation when the supplied password is four digits', async () => {
  const knownUser = DEFAULT_STAFF_DIRECTORY[0];
  assert.ok(knownUser);
  await assert.rejects(
    api.login({ ...baseRequest, emailOrPin: knownUser.email, passwordOrPin: '1234' }),
    /Invalid email or password/,
  );
});

test('rejects a forged mock token even when it names a real staff identity', async () => {
  const knownUser = DEFAULT_STAFF_DIRECTORY[0];
  assert.ok(knownUser);
  const forged = `mock-jwt-${knownUser.id}-${Date.now()}-attacker`;
  assert.equal(await api.verifySession(forged), null);
  assert.equal(await api.verifySession('not-a-session-token'), null);
});

test('accepts only a valid development PIN and invalidates its issued session on logout', async () => {
  const admin = DEFAULT_STAFF_DIRECTORY.find((user) => user.role === 'admin');
  assert.ok(admin, 'the development directory should include an admin test identity');
  const session = await api.login({ ...baseRequest, emailOrPin: '1234', passwordOrPin: '1234' });
  assert.equal(session.currentUser.id, admin.id);
  assert.equal((await api.verifySession(session.token))?.currentUser.id, admin.id);
  await api.logout(session.token);
  assert.equal(await api.verifySession(session.token), null);
});
