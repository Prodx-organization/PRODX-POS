export type AdminRole = 'owner' | 'admin' | 'manager' | 'cashier';

export function isAdminRole(role: unknown): role is Extract<AdminRole, 'owner' | 'admin'> {
  return role === 'owner' || role === 'admin';
}
