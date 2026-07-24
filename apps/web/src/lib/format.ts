export function formatDateTimeTR(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeTR(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTR(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
