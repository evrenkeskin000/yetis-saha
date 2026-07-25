'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { DealershipScopeProvider } from '../../lib/DealershipScopeContext';
import { useProfile } from '../../lib/hooks/useProfile';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useProfile();
  const pathname = usePathname();
  const router = useRouter();
  const isChangePasswordPage = pathname === '/sifre-degistir';

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace('/giris');
      return;
    }

    if (profile.must_change_password && !isChangePasswordPage) {
      router.replace('/sifre-degistir');
    }
  }, [loading, profile, isChangePasswordPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        Sistem hazırlanıyor...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        Giriş ekranına yönlendiriliyorsunuz...
      </div>
    );
  }

  if (profile.must_change_password && !isChangePasswordPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        Şifre değiştirme ekranına yönlendiriliyorsunuz...
      </div>
    );
  }

  if (profile.must_change_password && isChangePasswordPage) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar profile={profile} onSignOut={signOut} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DealershipScopeProvider>
      <DashboardShell>{children}</DashboardShell>
    </DealershipScopeProvider>
  );
}
