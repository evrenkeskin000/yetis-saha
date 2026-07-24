'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  LayoutDashboard,
  Settings,
  Store,
} from 'lucide-react';
import type { UserProfile } from '../lib/hooks/useProfile';

interface SidebarProps {
  profile: UserProfile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  const menuItems = [
    {
      label: 'Panel',
      href: '/panel',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Esnaflar',
      href: '/esnaflar',
      icon: Store,
      badge: null,
    },
    {
      label: 'Ziyaretler',
      href: '/ziyaretler',
      icon: Calendar,
      badge: null,
    },
    {
      label: 'Raporlar',
      href: '/raporlar',
      icon: BarChart3,
      badge: null,
    },
  ];

  if (isAdmin) {
    menuItems.push({
      label: 'Ayarlar',
      href: '/ayarlar',
      icon: Settings,
      badge: null,
    });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="text-xl font-black tracking-wider text-blue-400">
          SAHA
        </span>
        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          Yönetim
        </span>
      </div>

      {/* Menu Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Version */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        Saha Ekip Takip v1.0.0
      </div>
    </aside>
  );
}
