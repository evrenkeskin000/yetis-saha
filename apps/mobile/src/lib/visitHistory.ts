import type { SupabaseClient } from '@supabase/supabase-js';
import type { Visit } from '@saha/shared';
import { getVisitHistory } from '@saha/shared';

export const VISIT_HISTORY_PAGE_SIZE = 20;

export interface WeekSummary {
  completedCount: number;
  totalMinutes: number;
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Pazar
  const diff = day === 0 ? 6 : day - 1; // Pazartesi başlangıç
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Temsilcinin kendi ziyaret geçmişi — getVisitHistory üzerinden. */
export async function fetchMyVisitHistory(
  supabase: SupabaseClient,
  fieldRepId: string,
  offset = 0,
  limit = VISIT_HISTORY_PAGE_SIZE
): Promise<Visit[]> {
  return getVisitHistory(supabase, fieldRepId, { limit, offset });
}

/** Bu hafta tamamlanan ziyaret özeti (iptaller hariç). */
export async function fetchWeekSummary(
  supabase: SupabaseClient,
  fieldRepId: string
): Promise<WeekSummary> {
  const weekStart = startOfWeekISO();
  const { data, error } = await supabase
    .from('visits')
    .select('duration_minutes, cancelled_at, check_out_at')
    .eq('field_rep_id', fieldRepId)
    .gte('check_in_at', weekStart)
    .not('check_out_at', 'is', null)
    .is('cancelled_at', null);

  if (error) {
    console.error('Haftalık özet hatası:', error);
    return { completedCount: 0, totalMinutes: 0 };
  }

  const rows = data || [];
  return {
    completedCount: rows.length,
    totalMinutes: rows.reduce(
      (sum, r) => sum + (r.duration_minutes ?? 0),
      0
    ),
  };
}

export function visitDisplayName(visit: Visit): string {
  return visit.customer_snapshot?.business_name || 'Kayıt bilgisi yok';
}

export function isPreviousDealershipVisit(
  visit: Visit,
  profileDealershipId: string | null | undefined
): boolean {
  if (!profileDealershipId) return false;
  return visit.dealership_id !== profileDealershipId;
}
