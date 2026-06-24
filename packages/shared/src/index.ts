export const USER_ROLES = ['ADMIN', 'MANAGER', 'FINANCE', 'ATTENDANT', 'INSTALLER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPOINTMENT_STATUS = [
  'PENDING',
  'CONFIRMED',
  'IN_SERVICE',
  'FINISHED',
  'CANCELLED',
  'NO_SHOW'
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export function formatMoneyFromCents(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}
