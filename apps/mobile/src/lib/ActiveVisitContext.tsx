import type { Visit, VisitOutcome } from '@saha/shared';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ActivePhotoState,
  clearActiveVisitState,
  loadActiveVisitState,
  recoverActiveVisitFromSupabase,
  saveActiveVisitState,
} from './activeVisit';
import type { CustomerWithCategory } from './customers';
import { uploadVisitPhotoWithBuffer } from './photo';
import { supabase } from './supabase';
import { performCheckIn, performCheckOut, type CheckInResult } from './visits';

export interface ActiveVisitContextType {
  activeVisit: Visit | null;
  activeCustomer: CustomerWithCategory | null;
  capturedPhoto: ActivePhotoState | null;
  isInitialLoading: boolean;
  startVisit: (
    customer: CustomerWithCategory,
    forceOutOfRange?: boolean
  ) => Promise<CheckInResult>;
  completeCurrentVisit: (
    outcome: VisitOutcome,
    notes?: string
  ) => Promise<Visit>;
  setCapturedPhoto: (photo: ActivePhotoState | null) => Promise<void>;
  cancelCurrentVisit: () => Promise<void>;
  refreshActiveVisit: () => Promise<void>;
}

const ActiveVisitContext = createContext<ActiveVisitContextType | undefined>(
  undefined
);

export const ActiveVisitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<CustomerWithCategory | null>(
    null
  );
  const [capturedPhoto, setCapturedPhotoState] = useState<ActivePhotoState | null>(
    null
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Recovery on initialization
  useEffect(() => {
    (async () => {
      try {
        const localState = await loadActiveVisitState();
        if (localState.visit && localState.customer) {
          setActiveVisit(localState.visit);
          setActiveCustomer(localState.customer);
          setCapturedPhotoState(localState.photo);
        } else {
          const recovered = await recoverActiveVisitFromSupabase(supabase);
          if (recovered.visit && recovered.customer) {
            setActiveVisit(recovered.visit);
            setActiveCustomer(recovered.customer);
          }
        }
      } catch (err) {
        console.error('ActiveVisitProvider init error:', err);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, []);

  const startVisit = async (
    customer: CustomerWithCategory,
    forceOutOfRange = false
  ): Promise<CheckInResult> => {
    if (activeVisit) {
      throw new Error('Halen devam eden bir ziyaretiniz var.');
    }

    const checkInRes = await performCheckIn(supabase, customer, {
      forceOutOfRange,
    });

    if (checkInRes.visit) {
      setActiveVisit(checkInRes.visit);
      setActiveCustomer(customer);
      await saveActiveVisitState(checkInRes.visit, customer, null);
    }

    return checkInRes;
  };

  const setCapturedPhoto = async (photo: ActivePhotoState | null) => {
    setCapturedPhotoState(photo);
    await saveActiveVisitState(activeVisit, activeCustomer, photo);
  };

  const completeCurrentVisit = async (
    outcome: VisitOutcome,
    notes?: string
  ): Promise<Visit> => {
    if (!activeVisit) {
      throw new Error('Aktif bir ziyaret bulunamadı.');
    }

    if (!capturedPhoto) {
      throw new Error('Ziyareti bitirmek için en az 1 fotoğraf çekilmesi zorunludur.');
    }

    // Upload photo first
    await uploadVisitPhotoWithBuffer(
      supabase,
      activeVisit.id,
      capturedPhoto.uri,
      activeCustomer?.location
    );

    // Perform check-out
    const completed = await performCheckOut(
      supabase,
      activeVisit.id,
      outcome,
      notes
    );

    // Clear local active visit state
    setActiveVisit(null);
    setActiveCustomer(null);
    setCapturedPhotoState(null);
    await clearActiveVisitState();

    return completed;
  };

  const cancelCurrentVisit = async () => {
    // Note: cancellation clears local state (visit stays in DB as unchecked-out or aborted)
    setActiveVisit(null);
    setActiveCustomer(null);
    setCapturedPhotoState(null);
    await clearActiveVisitState();
  };

  const refreshActiveVisit = async () => {
    const recovered = await recoverActiveVisitFromSupabase(supabase);
    setActiveVisit(recovered.visit);
    setActiveCustomer(recovered.customer);
  };

  return (
    <ActiveVisitContext.Provider
      value={{
        activeVisit,
        activeCustomer,
        capturedPhoto,
        isInitialLoading,
        startVisit,
        completeCurrentVisit,
        setCapturedPhoto,
        cancelCurrentVisit,
        refreshActiveVisit,
      }}
    >
      {children}
    </ActiveVisitContext.Provider>
  );
};

export function useActiveVisit() {
  const context = useContext(ActiveVisitContext);
  if (!context) {
    throw new Error('useActiveVisit must be used within an ActiveVisitProvider');
  }
  return context;
}
