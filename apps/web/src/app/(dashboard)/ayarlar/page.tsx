'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Folders, Shield, Users } from 'lucide-react';
import { RoleGuard } from '../../../components/RoleGuard';
import { useProfile } from '../../../lib/hooks/useProfile';

export default function AyarlarPage() {
  const { profile } = useProfile();
  const isYetisAdmin = profile?.role === 'yetis_admin';

  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Sistem Ayarları</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase">
              <Shield className="w-3 h-3 text-teal-700" />
              {isYetisAdmin ? 'Yetiş Yönetimi' : 'Bayi Yönetimi'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isYetisAdmin
              ? 'Bayi, kategori ve kullanıcı yönetimini aşağıdan yönetebilirsiniz.'
              : 'Kendi bayinizdeki saha temsilcilerini oluşturun ve yönetin.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isYetisAdmin && (
            <Link
              href="/ayarlar/bayiler"
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-200 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  Bayi Yönetimi
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Yeni bayi açın, bilgilerini düzenleyin, pasife alın ve bayi
                  yöneticisi atayın.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform pt-2">
                <span>Bayilere Git</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}

          <Link
            href="/ayarlar/kategoriler"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-200 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform">
                <Folders className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                Kategori Yönetimi
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isYetisAdmin
                  ? 'Sistemdeki esnaf kategorilerini ekleyin, isim ve ikonlarını düzenleyin. Pasif kategoriler esnaf formunda görünmez.'
                  : 'Tüm bayiler için tanımlı esnaf kategorilerini görüntüleyin. Değişiklikler Yetiş yönetimi tarafından yapılır.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 group-hover:translate-x-1 transition-transform pt-2">
              <span>Kategorilere Git</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/ayarlar/kullanicilar"
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-200 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Kullanıcı Yönetimi
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isYetisAdmin
                  ? 'Yetiş yöneticisi, bayi yöneticisi veya saha temsilcisi oluşturun; rollerini ve hesap durumlarını yönetin.'
                  : 'Bayinizdeki saha temsilcilerini oluşturun, şifrelerini sıfırlayın ve aktif/pasif durumlarını yönetin.'}
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
