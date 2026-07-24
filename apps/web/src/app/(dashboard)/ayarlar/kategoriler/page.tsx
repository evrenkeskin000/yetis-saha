'use client';

import React from 'react';
import { RoleGuard } from '../../../../components/RoleGuard';
import { CategoryManager } from '../../../../components/ayarlar/CategoryManager';

export default function KategorilerPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <CategoryManager />
    </RoleGuard>
  );
}
