'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Folders, Shield, Users } from 'lucide-react';
import { RoleGuard } from '../../../components/RoleGuard';

export default function AyarlarPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Sistem Ayarları</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase">
              <Shield className="w-3 h-3 text-blue-700" />
              Admin Yalnızca
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Kategori yönetimi, kullanıcı davet ve yetkilendirme modüllerini aşağıdan yönetebilirsiniz.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Kategori Yönetimi */}
          <Link
            href="/ayarlar/kategoriler"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-200 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                <Folders className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Kategori Yönetimi
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sistemdeki esnaf kategorilerini ekleyin, isim ve ikonlarını düzenleyin. Pasif kategoriler esnaf formunda görünmez.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform pt-2">
              <span>Kategorilere Git</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Kullanıcı Yönetimi */}
          <Link
            href="/ayarlar/kullanicilar"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-200 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Kullanıcı Yönetimi
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sisteme yeni yönetici, müdür veya saha temsilcisi davet edin. Kullanıcı rollerini değiştirin ve aktif/pasif durumlarını yönetin.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform pt-2">
              <span>Kullanıcılara Git</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </RoleGuard>
  );
}
