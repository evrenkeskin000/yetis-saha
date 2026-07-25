import { ALL_DEALERSHIPS } from '@saha/shared';

export type DealershipScopeValue = typeof ALL_DEALERSHIPS | string;

/**
 * Bayi kapsam filtresi. scope === 'all' ise sorguya dokunulmaz.
 * Yetki sınırı değildir; RLS izolasyonu sağlar, bu yalnızca görünüm daraltır.
 *
 * Not: Supabase PostgrestFilterBuilder zinciri aşırı derin tip ürettiği için
 * sorgu tipi bilerek `any` tutulur.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyDealershipScope(query: any, scope: DealershipScopeValue): any {
  if (scope === ALL_DEALERSHIPS) {
    return query;
  }
  return query.eq('dealership_id', scope);
}

export function isAllDealershipsScope(scope: DealershipScopeValue): boolean {
  return scope === ALL_DEALERSHIPS;
}
