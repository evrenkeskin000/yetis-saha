import type { Visit, VisitOutcome, GeoPoint } from '@saha/shared';
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
import {
  performCancelVisit,
  performCheckIn,
  performCheckOut,
  type CheckInResult,
} from './visits';

export interface ActiveVisitContextType {
  activeVisit: Visit | null;
  activeCustomer: CustomerWithCategory | null;
  capturedPhoto: ActivePhotoState | null;
  isInitialLoading: boolean;
  startVisit: (customer: CustomerWithCategory) => Promise<CheckInResult>;
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
    customer: CustomerWithCategory
  ): Promise<CheckInResult> => {
    // Yerel boş olsa bile DB'de açık ziyaret olabilir
    if (!activeVisit) {
      const recovered = await recoverActiveVisitFromSupabase(supabase);
      if (recovered.visit && recovered.customer) {
        setActiveVisit(recovered.visit);
        setActiveCustomer(recovered.customer);
        throw new Error(
          'Zaten açık bir ziyaretiniz var. Önce onu tamamlayın veya iptal edin.'
        );
      }
    } else {
      throw new Error('Halen devam eden bir ziyaretiniz var.');
    }

    const checkInRes = await performCheckIn(supabase, customer);

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
      throw new Error(
        'Ziyareti bitirmek için en az 1 fotoğraf çekilmesi zorunludur.'
      );
    }

    let photoState = capturedPhoto;

    // Fotoğraf yüklendiyse ikinci kez yükleme (idempotent)
    if (!photoState.uploadedPhotoId) {
      const captureLoc: GeoPoint | null | undefined =
        photoState.captureLocation ?? null;
      const uploaded = await uploadVisitPhotoWithBuffer(
        supabase,
        activeVisit.id,
        photoState.uri,
        captureLoc
      );
      photoState = {
        ...photoState,
        uploadedPhotoId: uploaded.id,
      };
      setCapturedPhotoState(photoState);
      await saveActiveVisitState(activeVisit, activeCustomer, photoState);
    }

    try {
      const completed = await performCheckOut(
        supabase,
        activeVisit.id,
        outcome,
        notes
      );

      setActiveVisit(null);
      setActiveCustomer(null);
      setCapturedPhotoState(null);
      await clearActiveVisitState();

      return completed;
    } catch (err) {
      // Fotoğraf yüklü kaldı; check-out tekrar denenebilir
      throw err;
    }
  };

  const cancelCurrentVisit = async () => {
    if (!activeVisit) {
      throw new Error('Aktif bir ziyaret bulunamadı.');
    }

    await performCancelVisit(supabase, activeVisit.id);

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
