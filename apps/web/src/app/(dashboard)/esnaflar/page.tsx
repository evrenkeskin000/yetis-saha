'use client';

import React from 'react';
import { RoleGuard } from '../../../components/RoleGuard';
import { CustomerTable } from '../../../components/esnaflar/CustomerTable';

export default function EsnaflarPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <CustomerTable />
    </RoleGuard>
  );
}
