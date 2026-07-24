'use client';

import React from 'react';
import { RoleGuard } from '../../../../components/RoleGuard';
import { UserManager } from '../../../../components/ayarlar/UserManager';

export default function KullanicilarPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <UserManager />
    </RoleGuard>
  );
}
