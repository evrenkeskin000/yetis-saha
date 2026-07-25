'use client';

import React from 'react';
import { RoleGuard } from '../../../../components/RoleGuard';
import { CustomerForm } from '../../../../components/esnaflar/CustomerForm';

export default function YeniEsnafPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <CustomerForm isEditing={false} />
    </RoleGuard>
  );
}
