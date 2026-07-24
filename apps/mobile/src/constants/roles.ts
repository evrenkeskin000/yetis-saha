import { ROLE_LABELS, UserRole } from '@saha/shared';

export { ROLE_LABELS };
export type { UserRole };

export function getRoleLabel(role: UserRole | null | undefined): string {
  if (!role) return 'Bilinmiyor';
  return ROLE_LABELS[role] ?? role;
}
