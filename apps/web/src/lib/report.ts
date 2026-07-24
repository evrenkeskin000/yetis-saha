import type { Customer, User, Visit } from '@saha/shared';
import { OUTCOME_COLORS, OUTCOME_LABELS } from './outcome';

export type RangeType = 'today' | 'week' | 'month';

export interface RangeInfo {
  startISO: string;
  endISO: string;
  numDays: number;
}

export function getRangeDates(rangeType: RangeType, now: Date = new Date()): RangeInfo {
  const endISO = now.toISOString();

  if (rangeType === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      startISO: start.toISOString(),
      endISO,
      numDays: 1,
    };
  }

  if (rangeType === 'week') {
    const start = new Date(now);
    // Get Monday of current week
    const day = start.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diffToMon);
    start.setHours(0, 0, 0, 0);

    const timeDiff = now.getTime() - start.getTime();
    const elapsedDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    return {
      startISO: start.toISOString(),
      endISO,
      numDays: elapsedDays,
    };
  }

  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const timeDiff = now.getTime() - start.getTime();
  const elapsedDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

  return {
    startISO: start.toISOString(),
    endISO,
    numDays: elapsedDays,
  };
}

export interface KpiMetrics {
  avgDailyVisitsPerRepStr: string;
  coverageRatioStr: string;
  avgDurationStr: string;
  conversionRateStr: string;
  totalVisits: number;
  distinctVisitedCustomers: number;
  agreedVisits: number;
}

export function calculateKpis(
  visits: Visit[],
  reps: User[],
  customers: Customer[],
  rangeType: RangeType
): KpiMetrics {
  const rangeInfo = getRangeDates(rangeType);
  const totalVisits = visits.length;
  const numReps = reps.length;
  const numDays = rangeInfo.numDays;

  // 1. Daily Visits Per Rep
  let avgDailyVisitsPerRepStr = '—';
  if (numReps > 0 && numDays > 0) {
    const avg = totalVisits / (numDays * numReps);
    avgDailyVisitsPerRepStr = new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(avg);
  }

  // 2. Coverage Ratio
  const distinctVisitedSet = new Set(visits.map((v) => v.customer_id).filter(Boolean));
  const distinctVisitedCustomers = distinctVisitedSet.size;
  const totalActiveCustomers = customers.length;

  let coverageRatioStr = '—';
  if (totalActiveCustomers > 0) {
    const ratio = (distinctVisitedCustomers / totalActiveCustomers) * 100;
    coverageRatioStr = `%${Math.round(ratio)}`;
  }

  // 3. Avg Duration
  const completedVisits = visits.filter(
    (v) => v.duration_minutes !== null && v.duration_minutes !== undefined && v.duration_minutes > 0
  );
  let avgDurationStr = '—';
  if (completedVisits.length > 0) {
    const totalDuration = completedVisits.reduce((acc, v) => acc + (v.duration_minutes || 0), 0);
    const avg = Math.round(totalDuration / completedVisits.length);
    avgDurationStr = `${avg} dk`;
  }

  // 4. Conversion Rate (agreed / total)
  const agreedVisits = visits.filter((v) => v.outcome === 'agreed').length;
  let conversionRateStr = '—';
  if (totalVisits > 0) {
    const conv = (agreedVisits / totalVisits) * 100;
    conversionRateStr = `%${Math.round(conv)}`;
  }

  return {
    avgDailyVisitsPerRepStr,
    coverageRatioStr,
    avgDurationStr,
    conversionRateStr,
    totalVisits,
    distinctVisitedCustomers,
    agreedVisits,
  };
}

export interface RepPerformanceRow {
  id: string;
  full_name: string;
  email: string;
  totalVisits: number;
  completedVisits: number;
  avgDurationMinutes: number | null;
  agreedVisits: number;
  conversionRatePct: number;
}

export function calculateRepPerformance(
  visits: Visit[],
  reps: User[]
): RepPerformanceRow[] {
  const repMap = new Map<string, Visit[]>();
  reps.forEach((r) => repMap.set(r.id, []));

  visits.forEach((v) => {
    if (v.field_rep_id && repMap.has(v.field_rep_id)) {
      repMap.get(v.field_rep_id)!.push(v);
    }
  });

  const result: RepPerformanceRow[] = reps.map((rep) => {
    const repVisits = repMap.get(rep.id) || [];
    const totalVisits = repVisits.length;
    const completed = repVisits.filter(
      (v) => v.duration_minutes !== null && v.duration_minutes !== undefined && v.duration_minutes > 0
    );
    const completedVisits = completed.length;

    let avgDurationMinutes: number | null = null;
    if (completedVisits > 0) {
      const sum = completed.reduce((acc, v) => acc + (v.duration_minutes || 0), 0);
      avgDurationMinutes = Math.round(sum / completedVisits);
    }

    const agreedVisits = repVisits.filter((v) => v.outcome === 'agreed').length;
    const conversionRatePct = totalVisits > 0 ? (agreedVisits / totalVisits) * 100 : 0;

    return {
      id: rep.id,
      full_name: rep.full_name || 'Bilinmiyor',
      email: rep.email,
      totalVisits,
      completedVisits,
      avgDurationMinutes,
      agreedVisits,
      conversionRatePct,
    };
  });

  return result.sort((a, b) => {
    if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
    return b.agreedVisits - a.agreedVisits;
  });
}

export interface ExceptionRow {
  id: string;
  repName: string;
  customerName: string;
  checkInAt: string;
  durationMinutes: number | null;
  badges: string[];
}

export function calculateExceptions(
  visits: Visit[],
  repsMap: Map<string, { full_name: string }>,
  customersMap: Map<string, { business_name: string }>
): ExceptionRow[] {
  const exceptions: ExceptionRow[] = [];

  visits.forEach((v) => {
    const badges: string[] = [];

    // Rule 1: Short visit < 3 min
    if (v.duration_minutes !== null && v.duration_minutes !== undefined && v.duration_minutes < 3) {
      badges.push('Kısa Ziyaret');
    }

    // Rule 2: Geofence invalid
    if (v.is_geofence_valid === false) {
      badges.push('Geofence Dışı');
    }

    // Rule 3: Mock location
    if (v.is_mock_location === true) {
      badges.push('Sahte Konum');
    }

    if (badges.length > 0) {
      const rep = repsMap.get(v.field_rep_id);
      const cust = customersMap.get(v.customer_id);

      exceptions.push({
        id: v.id,
        repName: rep?.full_name || 'Bilinmeyen Temsilci',
        customerName: cust?.business_name || 'Bilinmeyen Esnaf',
        checkInAt: v.check_in_at,
        durationMinutes: v.duration_minutes,
        badges,
      });
    }
  });

  return exceptions.sort(
    (a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime()
  );
}

export interface LeaderboardRow extends RepPerformanceRow {
  rank: number;
  medal?: string;
}

export function calculateLeaderboard(
  repPerformance: RepPerformanceRow[]
): LeaderboardRow[] {
  const sorted = [...repPerformance].sort((a, b) => {
    if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
    return b.conversionRatePct - a.conversionRatePct;
  });

  const medals = ['🥇', '🥈', '🥉'];

  return sorted.map((row, idx) => ({
    ...row,
    rank: idx + 1,
    medal: idx < 3 ? medals[idx] : undefined,
  }));
}

export interface TrendBarData {
  label: string;
  ziyaret: number;
}

export function calculateTrendData(
  visits: Visit[],
  repsMap: Map<string, { full_name: string }>,
  rangeType: RangeType
): TrendBarData[] {
  if (rangeType === 'today') {
    // Group by representative
    const countMap = new Map<string, number>();
    repsMap.forEach((rep) => countMap.set(rep.full_name, 0));

    visits.forEach((v) => {
      const rep = repsMap.get(v.field_rep_id);
      if (rep) {
        countMap.set(rep.full_name, (countMap.get(rep.full_name) || 0) + 1);
      }
    });

    const result: TrendBarData[] = [];
    countMap.forEach((count, name) => {
      result.push({ label: name, ziyaret: count });
    });
    return result;
  }

  // Week or Month -> group by date (D MMM)
  const dateMap = new Map<string, number>();

  visits.forEach((v) => {
    if (v.check_in_at) {
      const d = new Date(v.check_in_at);
      const dateStr = d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      });
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    }
  });

  const result: TrendBarData[] = [];
  dateMap.forEach((count, dateLabel) => {
    result.push({ label: dateLabel, ziyaret: count });
  });

  return result;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export function calculateOutcomePieData(visits: Visit[]): PieChartData[] {
  const countMap = new Map<string, number>();

  visits.forEach((v) => {
    const outcome = v.outcome || 'in_progress';
    countMap.set(outcome, (countMap.get(outcome) || 0) + 1);
  });

  const result: PieChartData[] = [];

  countMap.forEach((count, outcomeKey) => {
    let name = 'Devam Ediyor';
    let color = '#f59e0b'; // amber

    if (outcomeKey !== 'in_progress') {
      name = OUTCOME_LABELS[outcomeKey] || outcomeKey;
      color = OUTCOME_COLORS[outcomeKey] || '#475569';
    }

    result.push({ name, value: count, color });
  });

  return result;
}
