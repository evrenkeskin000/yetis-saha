'use client';

import React from 'react';
import { LogOut, User } from 'lucide-react';
import { ROLE_LABELS } from '@saha/shared';
import type { UserProfile } from '../lib/hooks/useProfile';
import { DealershipSwitcher } from './DealershipSwitcher';

interface TopbarProps {
  profile: UserProfile | null;
  onSignOut: () => void;
}

export function Topbar({ profile, onSignOut }: TopbarProps) {
  const roleLabel = profile?.role
    ? ROLE_LABELS[profile.role]
    : 'Kullanıcı';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-sm font-medium text-slate-500 hidden sm:block shrink-0">
          Bugünün Saha Aktivite Takibi
        </div>
        <DealershipSwitcher />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-800">
              {profile?.full_name || 'Kullanıcı'}
            </div>
            <div className="text-xs text-teal-600 font-medium">{roleLabel}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </header>
  );
}
