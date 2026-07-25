'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RoleGuard } from '../../../../../components/RoleGuard';
import { createClient } from '../../../../../lib/supabase/client';
import {
  CustomerForm,
  type CustomerFormInitialValues,
} from '../../../../../components/esnaflar/CustomerForm';

interface PageProps {
  params: { id: string };
}

function EsnafDuzenleContent({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerFormInitialValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const { data, error: err } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (err || !data) {
          if (err?.code === '42501') {
            setError('Bu işlem için yetkiniz yok.');
          } else {
            setError('Düzenlenecek esnaf bulunamadı.');
          }
        } else {
          setCustomer(data as CustomerFormInitialValues);
        }
      } catch (err) {
        console.error('Esnaf bilgisi alınamadı:', err);
        setError('Beklenmeyen bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-medium">
        Esnaf verileri yükleniyor...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
          {error || 'Esnaf bilgisi yüklenemedi.'}
        </div>
      </div>
    );
  }

  return <CustomerForm initialCustomer={customer} isEditing={true} />;
}

export default function EsnafDuzenlePage({ params }: PageProps) {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <EsnafDuzenleContent customerId={params.id} />
    </RoleGuard>
  );
}
