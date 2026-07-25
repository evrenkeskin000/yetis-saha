'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ALL_DEALERSHIPS, type Dealership } from '@saha/shared';
import { useProfile } from './hooks/useProfile';
import { useDealerships } from './hooks/useDealerships';

const STORAGE_KEY = 'saha.dealershipScope';

export type DealershipScopeValue = typeof ALL_DEALERSHIPS | string;

export interface DealershipScopeState {
  /** 'all' veya bir dealership UUID */
  scope: DealershipScopeValue;
  /** Seçili tek bayi; 'all' iken null. dealer_admin için her zaman kendi bayisi. */
  dealership: Dealership | null;
  dealerships: Dealership[];
  loading: boolean;
  setScope: (scope: DealershipScopeValue) => void;
  refetchDealerships: () => Promise<void>;
}

const DealershipScopeContext = createContext<DealershipScopeState | null>(null);

function readStoredScope(): DealershipScopeValue {
  if (typeof window === 'undefined') return ALL_DEALERSHIPS;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_DEALERSHIPS;
    return raw;
  } catch {
    return ALL_DEALERSHIPS;
  }
}

function writeStoredScope(scope: DealershipScopeValue) {
  try {
    sessionStorage.setItem(STORAGE_KEY, scope);
  } catch {
    // sessionStorage erişilemezse sessizce geç
  }
}

export function DealershipScopeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading: profileLoading } = useProfile();
  const {
    dealerships,
    loading: dealershipsLoading,
    refetch,
  } = useDealerships();

  const [scope, setScopeState] = useState<DealershipScopeValue>(ALL_DEALERSHIPS);

  useEffect(() => {
    if (profileLoading) return;

    if (profile?.role === 'dealer_admin' && profile.dealership_id) {
      setScopeState(profile.dealership_id);
      return;
    }

    if (profile?.role === 'yetis_admin') {
      const stored = readStoredScope();
      setScopeState(stored);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (profile?.role !== 'yetis_admin') return;
    if (dealershipsLoading) return;
    if (scope === ALL_DEALERSHIPS) return;

    const exists = dealerships.some((d) => d.id === scope);
    if (!exists) {
      setScopeState(ALL_DEALERSHIPS);
      writeStoredScope(ALL_DEALERSHIPS);
    }
  }, [profile?.role, dealerships, dealershipsLoading, scope]);

  const setScope = useCallback(
    (next: DealershipScopeValue) => {
      if (profile?.role !== 'yetis_admin') return;
      setScopeState(next);
      writeStoredScope(next);
    },
    [profile?.role]
  );

  const dealership = useMemo(() => {
    if (scope === ALL_DEALERSHIPS) return null;
    return dealerships.find((d) => d.id === scope) ?? null;
  }, [scope, dealerships]);

  const value = useMemo<DealershipScopeState>(
    () => ({
      scope,
      dealership,
      dealerships,
      loading: profileLoading || dealershipsLoading,
      setScope,
      refetchDealerships: refetch,
    }),
    [
      scope,
      dealership,
      dealerships,
      profileLoading,
      dealershipsLoading,
      setScope,
      refetch,
    ]
  );

  return (
    <DealershipScopeContext.Provider value={value}>
      {children}
    </DealershipScopeContext.Provider>
  );
}

export function useDealershipScope(): DealershipScopeState {
  const ctx = useContext(DealershipScopeContext);
  if (!ctx) {
    throw new Error(
      'useDealershipScope bir DealershipScopeProvider içinde kullanılmalıdır.'
    );
  }
  return ctx;
}
