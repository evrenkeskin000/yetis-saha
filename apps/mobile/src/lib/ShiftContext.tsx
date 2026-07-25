import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { FLUSH_INTERVAL_MS } from '../constants/shift';
import { flushLocationBuffer, getPendingBufferCount } from './locationBuffer';
import { startShift, stopShift, syncShiftStatus } from './shift';

interface ShiftContextType {
  isShiftActive: boolean;
  shiftStartTime: string | null;
  pendingBufferCount: number;
  isInitialLoading: boolean;
  startShiftAction: () => Promise<void>;
  stopShiftAction: () => Promise<void>;
  flushBufferNow: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType>({
  isShiftActive: false,
  shiftStartTime: null,
  pendingBufferCount: 0,
  isInitialLoading: true,
  startShiftAction: async () => {},
  stopShiftAction: async () => {},
  flushBufferNow: async () => {},
});

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(null);
  const [pendingBufferCount, setPendingBufferCount] = useState<number>(0);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  const refreshBufferCount = async () => {
    const count = await getPendingBufferCount();
    setPendingBufferCount(count);
  };

  useEffect(() => {
    async function initShift() {
      try {
        setIsInitialLoading(true);
        const status = await syncShiftStatus();
        setIsShiftActive(status.isShiftActive);
        setShiftStartTime(status.startTime);
        if (status.isShiftActive) {
          console.log('[ShiftContext] Açılış flush çalıştırılıyor...');
          await flushLocationBuffer();
        }
        await refreshBufferCount();
      } catch (err) {
        console.error('[ShiftContext] Başlatma hatası:', err);
      } finally {
        setIsInitialLoading(false);
      }
    }

    initShift();
  }, []);

  // Periodic flush & buffer count check when shift is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isShiftActive) {
      interval = setInterval(async () => {
        console.log('[ShiftContext] 90 sn periyodik flush çalıştırılıyor...');
        await flushLocationBuffer();
        await refreshBufferCount();
      }, FLUSH_INTERVAL_MS);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isShiftActive]);

  const startShiftAction = async () => {
    const startTimeIso = await startShift();
    setIsShiftActive(true);
    setShiftStartTime(startTimeIso);
    // Panelin hemen görmesi için ilk flush (periyodik 90 sn beklemeden)
    try {
      await flushLocationBuffer();
    } catch (err) {
      console.warn('[ShiftContext] İlk flush atlandı:', err);
    }
    await refreshBufferCount();
  };

  const stopShiftAction = async () => {
    await stopShift();
    setIsShiftActive(false);
    setShiftStartTime(null);
    await refreshBufferCount();
  };

  const flushBufferNow = async () => {
    await flushLocationBuffer();
    await refreshBufferCount();
  };

  return (
    <ShiftContext.Provider
      value={{
        isShiftActive,
        shiftStartTime,
        pendingBufferCount,
        isInitialLoading,
        startShiftAction,
        stopShiftAction,
        flushBufferNow,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => useContext(ShiftContext);
