import { useMemo, useState } from 'react';
import { Box, Button, Group, MultiSelect, Stack, Text } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ymd } from '@/lib/dates';
import { diacriticsFilter } from '@/lib/text';

type Props = {
  /** ISO date strings (YYYY-MM-DD) */
  value: string[];
  onChange: (next: string[]) => void;
};

export function BudgetCalendar({ value, onChange }: Props) {
  const { t } = useTranslation();
  const today = useMemo(() => dayjs().startOf('day'), []);
  const [pickedMonths, setPickedMonths] = useState<string[]>([]);

  const dates = useMemo(() => value.map((s) => new Date(s)), [value]);

  function selectThisMonth() {
    onChange(daysInRange(today.startOf('month'), today.endOf('month')));
  }
  function selectThisYear() {
    onChange(daysInRange(today.startOf('year'), today.endOf('year')));
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
      const end = monthStart.endOf('month');
      for (const d of daysInRange(monthStart, end)) set.add(d);
    }
    onChange(Array.from(set).sort());
  }

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    let cursor = today.startOf('month').subtract(6, 'month');
    for (let i = 0; i < 19; i++) {
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
          {t('budgets.calendar.currentMonth')}
        </Button>
        <Button variant="light" size="xs" onClick={selectThisYear}>
          {t('budgets.calendar.currentYear')}
        </Button>
        <Button variant="subtle" size="xs" onClick={() => onChange([])} disabled={value.length === 0}>
          {t('budgets.calendar.clear')}
        </Button>
      </Group>

      <MultiSelect
        data={monthOptions}
        value={pickedMonths}
        onChange={selectMonths}
        label={t('budgets.calendar.selectMultipleMonths')}
        placeholder={t('budgets.calendar.monthPickerPlaceholder')}
        clearable
        searchable
        filter={diacriticsFilter}
      />

      <Box>
        <DatePicker
          type="multiple"
          value={dates}
          onChange={(next) => {
            const arr = Array.isArray(next) ? next : [];
            onChange(arr.map((d) => ymd(d as unknown as Date)).sort());
          }}
          firstDayOfWeek={1}
          weekendDays={[0, 6]}
        />
      </Box>

      <Text size="xs" c="dimmed">
        {value.length === 0
          ? t('budgets.calendar.noneSelected')
          : t('budgets.calendar.daysSelected', { count: value.length })}
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
