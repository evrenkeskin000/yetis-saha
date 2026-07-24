'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'field_rep';
  is_active: boolean;
}

export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      try {
        setLoading(true);
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
          .select('id, email, full_name, role, is_active')
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

    loadProfile();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/giris');
  };

  return { profile, loading, error, signOut };
}
