import dayjs, { Dayjs } from 'dayjs';

export type WeekSlice = {
  index: number;
  start: Dayjs;
  end: Dayjs;
};

/**
 * Split a calendar month into weeks confined to the month boundaries (the "April rule").
 *
 * - First slice starts on day 1 of the month and ends on the next Sunday (or month end if earlier).
 * - Middle slices are full Mon-Sun weeks.
 * - Final slice ends on the last day of the month (may be partial).
 *
 * Example: April 2026 → 5 slices, last one is Mon 27 Apr - Thu 30 Apr.
 *
 * Label formatting is intentionally NOT done here — callers should use i18n
 * (e.g. `t('expenses.weekLabel', { num, start, end })`) so the abbreviation
 * (Săpt./Week) and date format follow the current UI language.
 */
export function splitMonthIntoWeeks(monthAnchor: Dayjs | Date | string): WeekSlice[] {
  const start = dayjs(monthAnchor).startOf('month');
  const end = start.endOf('month').startOf('day');
  const slices: WeekSlice[] = [];

  let cursor = start;
  let index = 0;
  while (cursor.isSame(end) || cursor.isBefore(end)) {
    // dayjs isoWeekday: 1 = Monday, 7 = Sunday
    const isoWeekday = cursor.isoWeekday();
    const sliceStart = cursor;
    // End of this slice = following Sunday OR month end, whichever comes first
    const daysUntilSunday = 7 - isoWeekday; // 0 if today is Sunday
    let sliceEnd = cursor.add(daysUntilSunday, 'day');
    if (sliceEnd.isAfter(end)) sliceEnd = end;
    slices.push({
      index,
      start: sliceStart.startOf('day'),
      end: sliceEnd.startOf('day'),
    });
    cursor = sliceEnd.add(1, 'day');
    index += 1;
  }
  return slices;
}

export function isInRange(d: Dayjs | Date | string, start: Dayjs, end: Dayjs): boolean {
  const day = dayjs(d).startOf('day');
  return (day.isSame(start) || day.isAfter(start)) && (day.isSame(end) || day.isBefore(end));
}

export function todayIso(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function ymd(d: Dayjs | Date | string): string {
  return dayjs(d).format('YYYY-MM-DD');
}
