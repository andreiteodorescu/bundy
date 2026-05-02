import { useMemo, useState } from 'react';
import { Box, Button, Group, MultiSelect, Stack, Text } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import { ymd } from '@/lib/dates';

type Props = {
  /** ISO date strings (YYYY-MM-DD) */
  value: string[];
  onChange: (next: string[]) => void;
};

/**
 * Custom calendar for budget periods.
 *
 * Shortcuts above the multi-day picker:
 *   - "Luna curentă"   → all days from today to end of current month
 *   - "Anul curent"    → all days from today to end of current year
 *   - Multi-select dropdown of months from current to N future months → unions all days
 *
 * Manual: tap individual days to toggle them. Past days are disabled (budgets only forward).
 */
export function BudgetCalendar({ value, onChange }: Props) {
  const today = useMemo(() => dayjs().startOf('day'), []);
  const [pickedMonths, setPickedMonths] = useState<string[]>([]);

  const dates = useMemo(() => value.map((s) => new Date(s)), [value]);

  function selectThisMonth() {
    onChange(daysInRange(today, today.endOf('month')));
  }
  function selectThisYear() {
    onChange(daysInRange(today, today.endOf('year')));
  }
  function selectMonths(months: string[]) {
    setPickedMonths(months);
    if (months.length === 0) {
      onChange([]);
      return;
    }
    const set = new Set<string>();
    for (const ym of months) {
      const monthStart = dayjs(`${ym}-01`).startOf('month');
      const start = monthStart.isBefore(today) ? today : monthStart;
      const end = monthStart.endOf('month');
      for (const d of daysInRange(start, end)) set.add(d);
    }
    onChange(Array.from(set).sort());
  }

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    let cursor = today.startOf('month');
    for (let i = 0; i < 12; i++) {
      opts.push({
        value: cursor.format('YYYY-MM'),
        label: cursor.format('MMMM YYYY'),
      });
      cursor = cursor.add(1, 'month');
    }
    return opts;
  }, [today]);

  return (
    <Stack gap="sm">
      <Group gap="xs">
        <Button variant="light" size="xs" onClick={selectThisMonth}>
          Luna curentă
        </Button>
        <Button variant="light" size="xs" onClick={selectThisYear}>
          Anul curent
        </Button>
        <Button variant="subtle" size="xs" onClick={() => onChange([])} disabled={value.length === 0}>
          Șterge
        </Button>
      </Group>

      <MultiSelect
        data={monthOptions}
        value={pickedMonths}
        onChange={selectMonths}
        label="Selectează luni multiple (înainte)"
        placeholder="ex: aprilie, mai..."
        clearable
        searchable
      />

      <Box>
        <DatePicker
          type="multiple"
          value={dates}
          onChange={(next) => {
            const arr = Array.isArray(next) ? next : [];
            onChange(arr.map((d) => ymd(d as unknown as Date)).sort());
          }}
          minDate={today.toDate()}
          firstDayOfWeek={1}
          weekendDays={[0, 6]}
        />
      </Box>

      <Text size="xs" c="dimmed">
        {value.length === 0
          ? 'Niciun interval selectat'
          : `${value.length} ${value.length === 1 ? 'zi selectată' : 'zile selectate'}`}
      </Text>
    </Stack>
  );
}

function daysInRange(start: dayjs.Dayjs, end: dayjs.Dayjs): string[] {
  const out: string[] = [];
  let cursor = start.startOf('day');
  const cap = end.startOf('day');
  while (cursor.isSame(cap) || cursor.isBefore(cap)) {
    out.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return out;
}
