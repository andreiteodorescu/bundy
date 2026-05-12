import type { SubscriptionCadence } from '@/types';

/**
 * Convert any subscription cadence to its monthly RON equivalent. Used by the
 * "estimated monthly total" widget on the subscriptions list page.
 */
export function monthlyEquivalent(amount: number, cadence: SubscriptionCadence): number {
  switch (cadence) {
    case 'daily':
      return amount * (365.25 / 12);
    case 'weekly':
      return (amount * (365.25 / 7)) / 12;
    case 'biweekly':
      return (amount * (365.25 / 14)) / 12;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'semiannual':
      return amount / 6;
    case 'yearly':
      return amount / 12;
  }
}
