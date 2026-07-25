'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dealership } from '@saha/shared';
import { createClient } from '../supabase/client';

export function useDealerships() {
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: dbErr } = await supabase
        .from('dealerships')
        .select('*')
        .order('name', { ascending: true });

      if (dbErr) {
        if (dbErr.code === '42501') {
          setError('Bu işlem için yetkiniz yok.');
        } else {
          setError(`Bayiler yüklenemedi: ${dbErr.message}`);
        }
        setDealerships([]);
        return;
      }

      setDealerships((data as Dealership[]) ?? []);
    } catch (err) {
      console.error('Bayi yükleme hatası:', err);
      setError('Bayiler çekilirken bir hata oluştu.');
      setDealerships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { dealerships, loading, error, refetch };
}
