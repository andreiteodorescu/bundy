import { useState } from 'react';
import { useGoBack } from '@/lib/useGoBack';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBuildingBank,
  IconInfoCircle,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import { confirmDelete } from '@/lib/confirm';
import {
  useBankConnections,
  useBankImportRules,
  useDeleteBankRule,
  useDisconnectBankConnection,
  useImportedExpensesCount,
  useInitBankConnection,
  useTriggerBankSync,
  useUpsertBankRule,
} from './api';
import { BankRuleEditModal } from './BankRuleEditModal';
import { InstitutionPickerModal } from './InstitutionPickerModal';
import type { BankConnection, BankImportRule } from '@/types';

/**
 * Feature flag for the bank connection flow. Enabled once Salt Edge credentials
 * (SALTEDGE_APP_ID + SALTEDGE_APP_SECRET) are configured in Vercel. The button
 * is disabled and a "coming soon" notice is shown when this is false.
 */
const BANK_CONNECT_ENABLED = true;

export function BankConnectionsPage() {
  const { t } = useTranslation();
  const goBack = useGoBack('/more');
  const connections = useBankConnections();
  const rules = useBankImportRules();
  const cats = useCategories();
  const subs = useSubcategories();
  const deleteRule = useDeleteBankRule();
  const upsertRule = useUpsertBankRule();
  const initConnection = useInitBankConnection();
  const [editingRule, setEditingRule] = useState<BankImportRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [pickingBank, setPickingBank] = useState(false);

  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const subById = new Map((subs.data ?? []).map((s) => [s.id, s]));

  function handleDeleteRule(rule: BankImportRule) {
    confirmDelete({
      title: t('bank.ruleDeleteConfirm'),
      message: rule.keywords.join(', '),
      onConfirm: () => {
        deleteRule.mutate(rule.id, {
          onSuccess: () => notifications.show({
            message: t('bank.ruleDeleted'),
            color: 'gray',
            autoClose: 1500,
          }),
        });
      },
    });
  }

  function handleToggleRule(rule: BankImportRule, enabled: boolean) {
    upsertRule.mutate({
      id: rule.id,
      keywords: rule.keywords,
      category_id: rule.category_id ?? '',
      subcategory_id: rule.subcategory_id,
      priority: rule.priority,
      enabled,
    });
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={goBack}
          >
            {t('bank.back')}
          </Button>
        </Group>

        <Box>
          <Title order={2}>{t('bank.title')}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {t('bank.intro')}
          </Text>
        </Box>

        {/* Connections */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={600}>{t('bank.connectionsTitle')}</Text>
            <Button
              size="compact-sm"
              leftSection={<IconBuildingBank size={16} />}
              loading={initConnection.isPending}
              disabled={!BANK_CONNECT_ENABLED}
              onClick={() => setPickingBank(true)}
            >
              {t('bank.connectButton')}
            </Button>
          </Group>

          {!BANK_CONNECT_ENABLED && (
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              {t('bank.comingSoon')}
            </Alert>
          )}

          {connections.isLoading ? (
            <Center py="md"><Loader size="sm" /></Center>
          ) : (connections.data ?? []).length === 0 ? (
            <Text size="sm" c="dimmed">{t('bank.noConnections')}</Text>
          ) : (
            <Stack gap="xs">
              {(connections.data ?? []).map((c) => (
                <ConnectionRow key={c.id} connection={c} />
              ))}
            </Stack>
          )}
        </Stack>

        {/* Rules */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={600}>{t('bank.rulesTitle')}</Text>
            <Button
              size="compact-sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreating(true)}
            >
              {t('bank.ruleAdd')}
            </Button>
          </Group>
          <Text size="xs" c="dimmed">{t('bank.rulesIntro')}</Text>

          {rules.isLoading ? (
            <Center py="md"><Loader size="sm" /></Center>
          ) : (rules.data ?? []).length === 0 ? (
            <Text size="sm" c="dimmed">{t('bank.rulesEmpty')}</Text>
          ) : (
            <Stack gap="xs">
              {(rules.data ?? []).map((r) => {
                const category = r.category_id ? catById.get(r.category_id) ?? null : null;
                const subcategory = r.subcategory_id ? subById.get(r.subcategory_id) ?? null : null;
                return (
                  <Paper key={r.id} withBorder radius="md" p="sm">
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Box flex={1} miw={0}>
                        <Group gap={4} wrap="wrap">
                          {r.keywords.map((kw) => (
                            <Badge key={kw} size="sm" variant="light" radius="sm">
                              {kw}
                            </Badge>
                          ))}
                        </Group>
                        <Text size="xs" c="dimmed" mt={4}>
                          → {category ? categoryDisplayName(category, t) : '—'}
                          {subcategory && ` › ${subcategoryDisplayName(subcategory, t)}`}
                        </Text>
                      </Box>
                      <Group gap={4} wrap="nowrap">
                        <Switch
                          size="sm"
                          checked={r.enabled}
                          onChange={(e) => handleToggleRule(r, e.currentTarget.checked)}
                          aria-label={t('bank.ruleEnabledLabel')}
                        />
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => setEditingRule(r)}
                          aria-label={t('bank.ruleEdit')}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDeleteRule(r)}
                          aria-label={t('bank.ruleDelete')}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Stack>

      <BankRuleEditModal
        opened={creating || editingRule !== null}
        rule={editingRule}
        onClose={() => {
          setEditingRule(null);
          setCreating(false);
        }}
      />

      <InstitutionPickerModal
        opened={pickingBank}
        onClose={() => setPickingBank(false)}
        onPick={(inst) => {
          setPickingBank(false);
          initConnection.mutate(
            { institution_id: inst.id, institution_name: inst.name },
            {
              onSuccess: ({ link }) => {
                window.location.href = link;
              },
              onError: (err) => {
                notifications.show({
                  message: err instanceof Error ? err.message : 'Error',
                  color: 'red',
                });
              },
            },
          );
        }}
      />
    </Container>
  );
}

function ConnectionRow({ connection }: { connection: BankConnection }) {
  const { t } = useTranslation();
  const importedCount = useImportedExpensesCount(connection.id);
  const disconnect = useDisconnectBankConnection();
  const sync = useTriggerBankSync();

  function handleDisconnect() {
    confirmDelete({
      title: t('bank.disconnectConfirmTitle', { name: connection.institution_name }),
      message: t('bank.disconnectConfirmBody', { count: importedCount.data ?? 0 }),
      confirmLabel: t('bank.disconnectButton'),
      onConfirm: () => disconnect.mutate({ id: connection.id, deleteImported: false }),
    });
  }

  function handleSync() {
    sync.mutate(connection.id, {
      onSuccess: (data) => {
        notifications.show({
          message: t('bank.syncDone', {
            imported: data.imported,
            pending: data.pending,
          }),
          color: 'green',
          autoClose: 3000,
        });
      },
      onError: (err) => {
        notifications.show({
          message: err instanceof Error ? err.message : 'Error',
          color: 'red',
        });
      },
    });
  }

  const consentDays = connection.consent_expires_at
    ? Math.max(0, dayjs(connection.consent_expires_at).diff(dayjs(), 'day'))
    : null;

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Box flex={1} miw={0}>
          <Group gap="xs" wrap="nowrap">
            <Text fw={600} truncate>{connection.institution_name}</Text>
            <Badge
              size="xs"
              variant="light"
              color={connection.status === 'active' ? 'green' : 'red'}
            >
              {t(`bank.connectionStatus.${connection.status}`)}
            </Badge>
          </Group>
          {connection.iban && (
            <Text size="xs" c="dimmed" truncate>{connection.iban}</Text>
          )}
          <Text size="xs" c="dimmed">
            {connection.last_synced_at
              ? t('bank.lastSynced', {
                  when: dayjs(connection.last_synced_at).format('D MMM, HH:mm'),
                })
              : t('bank.lastSyncedNever')}
            {consentDays !== null && ` · ${t('bank.consentExpires', { days: consentDays })}`}
          </Text>
        </Box>
        <Group gap={4} wrap="nowrap">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconRefresh size={14} />}
            loading={sync.isPending}
            onClick={handleSync}
            disabled={connection.status !== 'active'}
          >
            {t('bank.syncNow')}
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="compact-sm"
            onClick={handleDisconnect}
          >
            {t('bank.disconnect')}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
