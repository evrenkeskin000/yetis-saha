import React from 'react';
import { Calendar } from 'lucide-react';

export default function ZiyaretlerPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 text-purple-600 mb-2">
          <Calendar className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Ziyaretler Geçmişi</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Bu modül yakında eklenecek. Geçmiş ziyaret arşivleri ve filtreleme ekranları Faz 2 kapsamında sunulacaktır.
        </p>
      </div>
    </div>
  );
}
