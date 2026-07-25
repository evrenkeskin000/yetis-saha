'use client';

import React from 'react';
import { RoleGuard } from '../../../components/RoleGuard';
import { CustomerTable } from '../../../components/esnaflar/CustomerTable';

export default function EsnaflarPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <CustomerTable />
    </RoleGuard>
  );
}
