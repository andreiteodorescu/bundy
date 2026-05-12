import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { splitMonthIntoWeeks, isInRange, ymd } from './dates';

describe('splitMonthIntoWeeks (April rule)', () => {
  it('April 2026 → 5 slices, last one ends Apr 30', () => {
    const slices = splitMonthIntoWeeks('2026-04-01');
    expect(slices).toHaveLength(5);
    expect(slices[0].start.format('YYYY-MM-DD')).toBe('2026-04-01');
    expect(slices[0].end.format('YYYY-MM-DD')).toBe('2026-04-05');
    expect(slices.at(-1)!.end.format('YYYY-MM-DD')).toBe('2026-04-30');
  });

  it('first slice ends on Sunday when month starts mid-week', () => {
    const slices = splitMonthIntoWeeks('2026-04-01');
    expect(slices[0].end.format('dddd')).toBe('Sunday');
  });

  it('month that starts on Monday → first slice is full Mon-Sun week', () => {
    const slices = splitMonthIntoWeeks('2025-09-01');
    expect(slices[0].start.format('dddd')).toBe('Monday');
    expect(slices[0].end.format('dddd')).toBe('Sunday');
    expect(slices[0].start.format('YYYY-MM-DD')).toBe('2025-09-01');
    expect(slices[0].end.format('YYYY-MM-DD')).toBe('2025-09-07');
  });

  it('month that starts on Sunday → first slice is single day', () => {
    const slices = splitMonthIntoWeeks('2026-02-01');
    expect(slices[0].start.format('YYYY-MM-DD')).toBe('2026-02-01');
    expect(slices[0].end.format('YYYY-MM-DD')).toBe('2026-02-01');
  });

  it('last slice ends exactly on the last day of the month', () => {
    const slices = splitMonthIntoWeeks('2026-02-01');
    expect(slices.at(-1)!.end.format('YYYY-MM-DD')).toBe('2026-02-28');
  });

  it('all slices stay within month boundaries', () => {
    const slices = splitMonthIntoWeeks('2026-04-01');
    const monthStart = dayjs('2026-04-01').startOf('month');
    const monthEnd = dayjs('2026-04-01').endOf('month').startOf('day');
    for (const s of slices) {
      expect(s.start.isBefore(monthStart)).toBe(false);
      expect(s.end.isAfter(monthEnd)).toBe(false);
    }
  });

  it('slices are contiguous and non-overlapping', () => {
    const slices = splitMonthIntoWeeks('2026-04-01');
    for (let i = 1; i < slices.length; i++) {
      const prevEnd = slices[i - 1].end;
      const curStart = slices[i].start;
      expect(curStart.diff(prevEnd, 'day')).toBe(1);
    }
  });

  it('label format is consistent (Săpt. N, D – D MMM)', () => {
    const slices = splitMonthIntoWeeks('2026-04-01');
    expect(slices[0].label).toMatch(/^Săpt\. 1, \d+ – \d+ /);
  });
});

describe('isInRange', () => {
  const start = dayjs('2026-04-10');
  const end = dayjs('2026-04-20');

  it.each<[string, boolean]>([
    ['2026-04-10', true],
    ['2026-04-15', true],
    ['2026-04-20', true],
    ['2026-04-09', false],
    ['2026-04-21', false],
  ])('%s → %s', (date, expected) => {
    expect(isInRange(date, start, end)).toBe(expected);
  });
});

describe('ymd', () => {
  it('formats Date to YYYY-MM-DD', () => {
    expect(ymd(new Date('2026-05-12T15:30:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats dayjs to YYYY-MM-DD', () => {
    expect(ymd(dayjs('2026-05-12'))).toBe('2026-05-12');
  });
});
