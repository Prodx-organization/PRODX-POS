import React from 'react';
import { AdminPortal } from '../../modules/admin/AdminPortal';

/**
 * Dedicated route boundary for the Owner/Admin console.
 * Authentication and database role resolution are performed by AdminPortal.
 * POS operator authentication remains independent and unchanged.
 */
export const AdminRoute: React.FC = () => <AdminPortal />;
