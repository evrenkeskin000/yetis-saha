'use client';

import React from 'react';
import { RoleGuard } from '../../../../components/RoleGuard';
import { DealershipManager } from '../../../../components/ayarlar/DealershipManager';

export default function BayilerPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin']}>
      <DealershipManager />
    </RoleGuard>
  );
}
