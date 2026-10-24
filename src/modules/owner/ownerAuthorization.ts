export const OWNER_ACCOUNT_EMAIL = 'prodx.owner@gmail.com';

const OWNER_ROLE = 'owner';

/**
 * The Owner Console is restricted to the one explicitly designated owner account.
 * A database role alone is insufficient; unknown and admin roles fail closed.
 * This is a UI gate only. Privileged APIs must independently enforce server-side auth.
 */
export function isAuthorizedOwnerAccount(email: unknown, role: unknown): boolean {
  return typeof email === 'string'
    && email.trim().toLowerCase() === OWNER_ACCOUNT_EMAIL
    && role === OWNER_ROLE;
}
