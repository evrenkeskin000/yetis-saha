'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@saha/shared';
import { createClient } from '../supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  dealership_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
}

export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error: dbErr } = await supabase
        .from('users')
        .select('id, email, full_name, role, dealership_id, is_active, must_change_password')
        .eq('id', user.id)
        .single();

      if (dbErr || !data) {
        setError('Kullanıcı profili alınamadı.');
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError('Profil yüklenirken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/giris');
  };

  return { profile, loading, error, signOut, refresh: loadProfile };
}
