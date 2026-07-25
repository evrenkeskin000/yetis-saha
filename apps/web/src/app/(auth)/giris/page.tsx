'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

const HATA_MESAJLARI: Record<string, string> = {
  mobil_kullanici:
    'Bu hesap mobil uygulama içindir. Lütfen Yetiş+ Saha mobil uygulamasından giriş yapın.',
  hesap_pasif:
    'Hesabınız veya bayiniz pasif durumda. Bayi yöneticinizle görüşün.',
  profil_yok: 'Kullanıcı profili bulunamadı. Lütfen tekrar giriş yapın.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const hata = searchParams.get('hata');
    if (hata && HATA_MESAJLARI[hata]) {
      setErrorMessage(HATA_MESAJLARI[hata]);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data: authData, error: authErr } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authErr || !authData.user) {
        setErrorMessage(
          authErr?.message === 'Invalid login credentials'
            ? 'E-posta veya şifre hatalı.'
            : authErr?.message || 'Giriş yapılırken bir hata oluştu.'
        );
        return;
      }

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select(
          'role, is_active, must_change_password, dealership_id, dealerships(is_active)'
        )
        .eq('id', authData.user.id)
        .single();

      if (userErr || !userData) {
        await supabase.auth.signOut();
        setErrorMessage('Kullanıcı rol bilgisi doğrulanamadı.');
        return;
      }

      if (!userData.is_active) {
        await supabase.auth.signOut();
        setErrorMessage(
          'Hesabınız pasif durumda. Bayi yöneticinizle görüşün.'
        );
        return;
      }

      const dealership = userData.dealerships as
        | { is_active: boolean }
        | { is_active: boolean }[]
        | null;
      const dealershipRow = Array.isArray(dealership)
        ? dealership[0]
        : dealership;
      if (
        userData.dealership_id != null &&
        dealershipRow?.is_active !== true
      ) {
        await supabase.auth.signOut();
        setErrorMessage(
          'Bayiniz pasif durumda. Yetiş yöneticinizle görüşün.'
        );
        return;
      }

      if (userData.role === 'field_rep') {
        await supabase.auth.signOut();
        setErrorMessage(
          'Bu hesap mobil uygulama içindir. Lütfen Yetiş+ Saha mobil uygulamasından giriş yapın.'
        );
        return;
      }

      if (
        userData.role !== 'yetis_admin' &&
        userData.role !== 'dealer_admin'
      ) {
        await supabase.auth.signOut();
        setErrorMessage('Bu panele erişim yetkiniz yok.');
        return;
      }

      if (userData.must_change_password) {
        router.replace('/sifre-degistir');
      } else {
        router.replace('/panel');
      }
      router.refresh();
    } catch (err) {
      console.error('Giriş hatası:', err);
      setErrorMessage('Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
      <div className="text-center space-y-2">
        <img
          src="/brand/yetisplus-logo.png"
          alt="Yetiş+ Saha"
          className="mx-auto h-16 w-auto mb-2"
        />
        <h2 className="text-2xl font-bold text-slate-100">
          Yetiş+ Saha Yönetim Paneli
        </h2>
        <p className="text-sm text-slate-400">
          Yönetici hesabınızla giriş yapın
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl">
          {errorMessage}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
            >
              E-Posta Adresi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="ornek@yetisplus.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
            >
              Şifre
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-slate-900 bg-teal-500 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <Suspense
        fallback={
          <div className="text-slate-400 text-sm">Yükleniyor...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
