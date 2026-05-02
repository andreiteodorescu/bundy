import dayjs from 'dayjs';
import type { Budget } from '@/types';

export type BudgetStatus = {
  kind: 'active' | 'warning' | 'exceeded' | 'achieved' | 'upcoming';
  label: string;
  color: 'accent' | 'orange' | 'red' | 'green' | 'gray';
};

/**
 * Determine the status of a budget given how much has been spent.
 *
 *  upcoming  → period hasn't started yet
 *  exceeded  → spent > amount (whether period is active or finished)
 *  achieved  → period finished, spent <= amount
 *  warning   → period is active and spent >= 90% (but not yet exceeded)
 *  active    → period is active and progress is healthy
 */
export function computeBudgetStatus(budget: Budget, spent: number): BudgetStatus {
  const amount = Number(budget.amount_ron);
  const today = dayjs().format('YYYY-MM-DD');
  const start = budget.period_start;
  const end = budget.period_end;
  const inPeriod = budget.selected_days?.length
    ? today >= budget.selected_days[0] && today <= budget.selected_days[budget.selected_days.length - 1]
    : today >= start && today <= end;
  const finished = today > (budget.selected_days?.length ? budget.selected_days[budget.selected_days.length - 1] : end);
  const notStarted = today < (budget.selected_days?.length ? budget.selected_days[0] : start);

  if (notStarted) {
    return { kind: 'upcoming', label: 'Următor', color: 'gray' };
  }

  if (spent > amount) {
    return { kind: 'exceeded', label: 'Depășit', color: 'red' };
  }

  if (finished) {
    return { kind: 'achieved', label: 'Atins', color: 'green' };
  }

  if (inPeriod && amount > 0 && spent >= amount * 0.9) {
    return { kind: 'warning', label: 'Aproape', color: 'orange' };
  }

  return { kind: 'active', label: 'Activ', color: 'accent' };
}
