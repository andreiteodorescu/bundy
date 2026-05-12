import { useEffect, useState } from 'react';
import { Button, Modal, NumberInput, Select, Stack, Switch, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import { useUpsertBankRule } from './api';
import type { BankImportRule } from '@/types';

export function BankRuleEditModal({
  opened,
  rule,
  onClose,
}: {
  opened: boolean;
  rule: BankImportRule | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertBankRule();

  const [keywords, setKeywords] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<number>(10);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setKeywords(rule?.keywords.join(', ') ?? '');
    setCategoryId(rule?.category_id ?? null);
    setSubcategoryId(rule?.subcategory_id ?? null);
    setPriority(rule?.priority ?? 10);
    setEnabled(rule?.enabled ?? true);
    setError(null);
  }, [opened, rule]);

  const categoryOptions = (cats.data ?? []).map((c) => ({
    value: c.id,
    label: categoryDisplayName(c, t),
  }));

  const subcategoryOptions = (subs.data ?? [])
    .filter((s) => s.parent_category_id === categoryId)
    .map((s) => ({
      value: s.id,
      label: subcategoryDisplayName(s, t),
    }));

  function handleSave() {
    const cleanedKeywords = keywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (cleanedKeywords.length === 0) {
      setError(t('bank.ruleKeywordsRequired'));
      return;
    }
    if (!categoryId) {
      setError(t('bank.ruleCategoryRequired'));
      return;
    }

    upsert.mutate(
      {
        id: rule?.id,
        keywords: cleanedKeywords,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        priority,
        enabled,
      },
      {
        onSuccess: () => {
          notifications.show({
            message: t('bank.ruleSaved'),
            color: 'green',
            autoClose: 1500,
          });
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Error');
        },
      },
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('bank.ruleAdd')}
      size="md"
      closeOnClickOutside={false}
    >
      <Stack gap="sm">
        <Textarea
          label={t('bank.ruleKeywordsLabel')}
          placeholder={t('bank.ruleKeywordsPlaceholder')}
          description={t('bank.ruleKeywordsHelp')}
          value={keywords}
          onChange={(e) => setKeywords(e.currentTarget.value)}
          autosize
          minRows={2}
        />
        <Select
          label={t('bank.ruleCategoryLabel')}
          data={categoryOptions}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setSubcategoryId(null);
          }}
          searchable
          required
        />
        <Select
          label={t('bank.ruleSubcategoryLabel')}
          data={subcategoryOptions}
          value={subcategoryId}
          onChange={setSubcategoryId}
          searchable
          clearable
          disabled={!categoryId || subcategoryOptions.length === 0}
        />
        <NumberInput
          label={t('bank.rulePriorityLabel')}
          value={priority}
          onChange={(v) => setPriority(Number(v) || 0)}
          min={0}
          max={100}
        />
        <Switch
          label={t('bank.ruleEnabledLabel')}
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
        {error && <div style={{ color: 'var(--mantine-color-red-4)' }}>{error}</div>}
        <Button onClick={handleSave} loading={upsert.isPending}>
          {t('bank.ruleSave')}
        </Button>
      </Stack>
    </Modal>
  );
}
