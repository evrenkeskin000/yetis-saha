'use client';

import React from 'react';
import { getOutcomeColor, getOutcomeLabel } from '../../lib/outcome';

interface OutcomeBadgeProps {
  outcome?: string | null;
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const label = getOutcomeLabel(outcome);
  const color = getOutcomeColor(outcome);

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-2xs"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
