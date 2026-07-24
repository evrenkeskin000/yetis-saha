'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '../lib/hooks/useProfile';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'manager'>;
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const { profile, loading } = useProfile();

  useEffect(() => {
    if (!loading && profile) {
      if (!allowedRoles.includes(profile.role as 'admin' | 'manager')) {
        router.replace('/panel');
      }
    }
  }, [profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
        Yetki kontrolü yapılıyor...
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role as 'admin' | 'manager')) {
    return null;
  }

  return <>{children}</>;
}
