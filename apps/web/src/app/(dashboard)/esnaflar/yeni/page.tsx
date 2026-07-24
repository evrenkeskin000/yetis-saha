'use client';

import React from 'react';
import { RoleGuard } from '../../../../components/RoleGuard';
import { CustomerForm } from '../../../../components/esnaflar/CustomerForm';

export default function YeniEsnafPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <CustomerForm isEditing={false} />
    </RoleGuard>
  );
}
