import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoBack } from '@/lib/useGoBack';
import {
  Alert,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowUp,
  IconBug,
  IconPlus,
  IconSparkles,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  statusesFor,
  useFeedbackList,
  useFeedbackNotifications,
  useFeedbackVotes,
  useMarkAllNotificationsRead,
  useToggleVote,
  useUpsertFeedback,
} from './api';
import type { Feedback, FeedbackStatus, FeedbackType } from '@/types';

export function FeedbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const { user } = useAuth();

  const list = useFeedbackList();
  const votes = useFeedbackVotes();
  const notifs = useFeedbackNotifications();
  const markRead = useMarkAllNotificationsRead();

  const [tab, setTab] = useState<FeedbackType>('bug');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | null>(null);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [creating, setCreating] = useState<FeedbackType | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);

  // Mark all notifications as read when user opens the page (one-shot per visit).
  useEffect(() => {
    const unread = (notifs.data ?? []).some((n) => n.read_at === null);
    if (unread) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs.data?.length]);

  const filtered = useMemo(() => {
    let arr = (list.data ?? []).filter((f) => f.type === tab);
    if (statusFilter) arr = arr.filter((f) => f.status === statusFilter);
    return arr;
  }, [list.data, tab, statusFilter]);

  const allStatuses = statusesFor(tab);

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={goBack}
          >
            {t('feedback.back')}
          </Button>
          <Group gap="xs">
            {(notifs.data ?? []).length > 0 && (
              <Button
                variant="subtle"
                size="compact-sm"
                color="gray"
                onClick={() => setShowNotifs(true)}
              >
                {t('feedback.notifications.title')}
              </Button>
            )}
            <Button
              size="compact-sm"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreating(tab)}
            >
              {t('feedback.newButton')}
            </Button>
          </Group>
        </Group>

        <Title order={2}>{t('feedback.title')}</Title>
        <Text size="sm" c="dimmed">
          {t('feedback.intro')}
        </Text>

        <SegmentedControl
          fullWidth
          value={tab}
          onChange={(v) => {
            setTab(v as FeedbackType);
            setStatusFilter(null);
          }}
          data={[
            { value: 'bug', label: t('feedback.tabBugs') },
            { value: 'feature', label: t('feedback.tabFeatures') },
          ]}
        />

        <Select
          placeholder={t('feedback.filterAll')}
          data={allStatuses.map((s) => ({ value: s, label: t(`feedback.status.${s}`) }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as FeedbackStatus | null)}
          clearable
          size="sm"
        />

        {list.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              {tab === 'bug' ? (
                <IconBug size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              ) : (
                <IconSparkles size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              )}
              <Text c="dimmed" size="sm">
                {t('feedback.empty')}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {filtered.map((f) => (
              <FeedbackRow
                key={f.id}
                feedback={f}
                voted={votes.data?.has(f.id) ?? false}
                isOwn={f.profile_id === user?.id}
                onOpenDetail={() => navigate(`/feedback/${f.id}`)}
                t={t}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <FeedbackFormModal
        open={creating !== null || editing !== null}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
        editing={editing}
        defaultType={creating ?? tab}
        t={t}
      />

      <NotificationsModal
        open={showNotifs}
        onClose={() => setShowNotifs(false)}
        feedbackList={list.data ?? []}
        t={t}
      />
    </Container>
  );
}

function FeedbackRow({
  feedback,
  voted,
  isOwn,
  onOpenDetail,
  t,
}: {
  feedback: Feedback;
  voted: boolean;
  isOwn: boolean;
  onOpenDetail: () => void;
  t: TFunction;
}) {
  const toggle = useToggleVote();

  const statusColor: Record<FeedbackStatus, string> = {
    open: 'orange',
    in_progress: 'blue',
    fixed: 'green',
    wont_fix: 'gray',
    proposed: 'gray',
    planned: 'blue',
    done: 'green',
    declined: 'red',
  };

  return (
    <Paper withBorder radius="md" p="sm">
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <UnstyledButton
          onClick={() => toggle.mutate({ feedbackId: feedback.id, voted })}
          disabled={toggle.isPending}
          aria-label={t('feedback.voteAria')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            padding: '8px 4px',
            borderRadius: 8,
            background: voted ? 'var(--mantine-primary-color-light)' : 'var(--mantine-color-default-hover)',
            color: voted ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-text)',
            transition: 'background 160ms',
          }}
        >
          <IconArrowUp size={16} stroke={voted ? 2.4 : 1.8} />
          <Text size="sm" fw={700} lh={1.1}>
            {feedback.votes_count}
          </Text>
        </UnstyledButton>

        <UnstyledButton
          onClick={onOpenDetail}
          aria-label={t('feedback.detail.viewDetail')}
          style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
        >
          <Group gap={6} wrap="wrap" mb={4}>
            <Badge size="xs" color={feedback.type === 'bug' ? 'red' : 'accent'} variant="light">
              {t(`feedback.type.${feedback.type}`)}
            </Badge>
            <Badge size="xs" color={statusColor[feedback.status]} variant="light">
              {t(`feedback.status.${feedback.status}`)}
            </Badge>
            {isOwn && (
              <Badge size="xs" color="gray" variant="dot">
                {t('feedback.byYou')}
              </Badge>
            )}
          </Group>
          <Text fw={600} size="sm">
            {feedback.title}
          </Text>
          {feedback.body && (
            <Text size="xs" c="dimmed" mt={4} lineClamp={3} style={{ whiteSpace: 'pre-wrap' }}>
              {feedback.body}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={6}>
            {dayjs(feedback.created_at).format('D MMM YYYY')}
          </Text>
        </UnstyledButton>
      </Group>
    </Paper>
  );
}

function FeedbackFormModal({
  open,
  onClose,
  editing,
  defaultType,
  t,
}: {
  open: boolean;
  onClose: () => void;
  editing: Feedback | null;
  defaultType: FeedbackType;
  t: TFunction;
}) {
  const upsert = useUpsertFeedback();
  const [type, setType] = useState<FeedbackType>(editing?.type ?? defaultType);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(editing?.type ?? defaultType);
      setTitle(editing?.title ?? '');
      setBody(editing?.body ?? '');
      setError(null);
    }
  }, [open, editing, defaultType]);

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError(t('feedback.form.errorTitleRequired'));
      return;
    }
    try {
      await upsert.mutateAsync({ id: editing?.id, type, title, body });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedback.form.errorSave'));
    }
  }

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={editing ? t('feedback.form.editTitle') : t('feedback.form.newTitle')}
      centered
      size="md"
      // Don't close on outside-click — users typing title/body lose their input if
      // they tap outside by accident. Close button + Escape are still available.
      closeOnClickOutside={false}
    >
      <Stack gap="sm">
        <SegmentedControl
          fullWidth
          value={type}
          onChange={(v) => setType(v as FeedbackType)}
          data={[
            { value: 'bug', label: t('feedback.type.bug') },
            { value: 'feature', label: t('feedback.type.feature') },
          ]}
        />
        <TextInput
          label={t('feedback.form.title')}
          placeholder={t('feedback.form.titlePlaceholder')}
          required
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <Textarea
          label={t('feedback.form.body')}
          placeholder={t('feedback.form.bodyPlaceholder')}
          autosize
          minRows={3}
          maxRows={8}
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
        />
        {error && (
          <Alert color="red" py={6}>
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('feedback.form.cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={upsert.isPending}>
            {editing ? t('feedback.form.save') : t('feedback.form.submit')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function NotificationsModal({
  open,
  onClose,
  feedbackList,
  t,
}: {
  open: boolean;
  onClose: () => void;
  feedbackList: Feedback[];
  t: TFunction;
}) {
  const notifs = useFeedbackNotifications();
  const byId = new Map(feedbackList.map((f) => [f.id, f]));

  return (
    <Modal opened={open} onClose={onClose} title={t('feedback.notifications.title')} centered size="md">
      <Stack gap="xs">
        {(notifs.data ?? []).length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            {t('feedback.notifications.empty')}
          </Text>
        ) : (
          (notifs.data ?? []).map((n) => {
            const fb = byId.get(n.feedback_id);
            if (!fb) return null;
            return (
              <Paper key={n.id} withBorder radius="md" p="sm">
                <Text size="sm">
                  {t('feedback.notifications.row', {
                    type: t(`feedback.type.${fb.type}`).toLowerCase(),
                    title: fb.title,
                    status: t(`feedback.status.${n.new_status}`),
                  })}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {dayjs(n.created_at).format('D MMM HH:mm')}
                </Text>
              </Paper>
            );
          })
        )}
      </Stack>
    </Modal>
  );
}
