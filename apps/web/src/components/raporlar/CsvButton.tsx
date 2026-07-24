'use client';

import React from 'react';
import { Download } from 'lucide-react';

interface CsvButtonProps {
  onExport: () => void;
  label?: string;
}

export function CsvButton({ onExport, label = 'CSV İndir' }: CsvButtonProps) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
    >
      <Download className="w-3.5 h-3.5 text-slate-500" />
      <span>{label}</span>
    </button>
  );
}
