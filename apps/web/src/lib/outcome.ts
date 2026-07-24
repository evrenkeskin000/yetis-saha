export const OUTCOME_LABELS: Record<string, string> = {
  agreed: 'Anlaşıldı / Satış Yapıldı',
  quote_given: 'Teklif Verildi',
  decision_maker_absent: 'Karar Verici Yerinde Yok',
  not_interested: 'İlgilenmedi',
  follow_up_needed: 'Tekrar Uğranacak',
  complaint: 'Şikayet / Talep',
  other: 'Diğer',
};

export const OUTCOME_COLORS: Record<string, string> = {
  agreed: '#16a34a',
  quote_given: '#2563eb',
  decision_maker_absent: '#d97706',
  not_interested: '#dc2626',
  follow_up_needed: '#7c3aed',
  complaint: '#db2777',
  other: '#475569',
};

export function getOutcomeLabel(outcome?: string | null): string {
  if (!outcome) return 'Devam Ediyor';
  return OUTCOME_LABELS[outcome] || outcome;
}

export function getOutcomeColor(outcome?: string | null): string {
  if (!outcome) return '#f59e0b'; // amber for in-progress
  return OUTCOME_COLORS[outcome] || '#475569';
}
