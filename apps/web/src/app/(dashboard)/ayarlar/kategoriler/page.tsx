'use client';

import React from 'react';
import { RoleGuard } from '../../../../components/RoleGuard';
import { CategoryManager } from '../../../../components/ayarlar/CategoryManager';

export default function KategorilerPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <CategoryManager />
    </RoleGuard>
  );
}
