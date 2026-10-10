const OWNER_ROLES = new Set(['owner', 'admin']);

/**
 * Authorization roles are sourced from public.user_roles, never browser metadata.
 * Unknown, missing, and staff roles fail closed.
 */
export function isOwnerRole(role: unknown): role is 'owner' | 'admin' {
  return typeof role === 'string' && OWNER_ROLES.has(role);
}
