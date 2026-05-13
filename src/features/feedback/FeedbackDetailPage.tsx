import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Menu,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications as toast } from '@mantine/notifications';
import { IconArrowLeft, IconArrowUp, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIsAdmin } from '@/features/admin/api';
import { confirmDelete } from '@/lib/confirm';
import {
  statusesFor,
  useAddFeedbackComment,
  useDeleteFeedback,
  useDeleteFeedbackComment,
  useFeedback,
  useFeedbackAuthorNames,
  useFeedbackComments,
  useToggleVote,
  useUpdateFeedbackComment,
  useUpdateFeedbackStatus,
} from './api';
import type { Feedback, FeedbackComment, FeedbackStatus } from '@/types';

const STATUS_COLOR: Record<FeedbackStatus, string> = {
  open: 'orange',
  in_progress: 'blue',
  fixed: 'green',
  wont_fix: 'gray',
  proposed: 'gray',
  planned: 'blue',
  done: 'green',
  declined: 'red',
};

export function FeedbackDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  const feedback = useFeedback(id);
  const comments = useFeedbackComments(id);

  const authorIds = useMemo(() => {
    const ids: string[] = [];
    if (feedback.data) ids.push(feedback.data.profile_id);
    for (const c of comments.data ?? []) ids.push(c.profile_id);
    return ids;
  }, [feedback.data, comments.data]);
  const authors = useFeedbackAuthorNames(authorIds);

  const isOwn = feedback.data?.profile_id === user?.id;
  const canChangeStatus = isAdmin.data === true;

  if (feedback.isLoading) {
    return (
      <Container size="sm" py="md">
        <Center py="xl">
          <Loader />
        </Center>
      </Container>
    );
  }

  if (!feedback.data) {
    return (
      <Container size="sm" py="md">
        <Stack gap="md">
          <BackButton t={t} onClick={() => navigate('/feedback')} />
          <Alert color="gray">{t('feedback.detail.notFound')}</Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <BackButton t={t} onClick={() => navigate('/feedback')} />

        <FeedbackCard
          feedback={feedback.data}
          authorName={authors.data?.get(feedback.data.profile_id) ?? null}
          isOwn={isOwn}
          isAdmin={canChangeStatus}
          onDeleted={() => navigate('/feedback')}
          t={t}
        />

        <Box>
          <Title order={4} mb="xs">
            {t('feedback.detail.commentsTitle')} ({comments.data?.length ?? 0})
          </Title>

          {comments.isLoading ? (
            <Center py="md">
              <Loader size="sm" />
            </Center>
          ) : (comments.data ?? []).length === 0 ? (
            <Text c="dimmed" size="sm">
              {t('feedback.detail.commentsEmpty')}
            </Text>
          ) : (
            <Stack gap="xs">
              {(comments.data ?? []).map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  authorName={authors.data?.get(c.profile_id) ?? null}
                  isOwn={c.profile_id === user?.id}
                  canDelete={c.profile_id === user?.id || canChangeStatus}
                  t={t}
                />
              ))}
            </Stack>
          )}
        </Box>

        <AddCommentForm feedbackId={feedback.data.id} t={t} />
      </Stack>
    </Container>
  );
}

function BackButton({ t, onClick }: { t: TFunction; onClick: () => void }) {
  return (
    <Group gap="xs">
      <Button
        variant="subtle"
        color="gray"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
        onClick={onClick}
      >
        {t('feedback.detail.back')}
      </Button>
    </Group>
  );
}

function FeedbackCard({
  feedback,
  authorName,
  isOwn,
  isAdmin,
  onDeleted,
  t,
}: {
  feedback: Feedback;
  authorName: string | null;
  isOwn: boolean;
  isAdmin: boolean;
  onDeleted: () => void;
  t: TFunction;
}) {
  const toggle = useToggleVote();
  const updateStatus = useUpdateFeedbackStatus();
  const del = useDeleteFeedback();
  const allStatuses = statusesFor(feedback.type);

  function handleDelete() {
    confirmDelete({
      message: t('feedback.form.deleteConfirm'),
      onConfirm: async () => {
        await del.mutateAsync(feedback.id);
        onDeleted();
      },
    });
  }

  function handleStatusChange(status: FeedbackStatus) {
    updateStatus.mutate(
      { id: feedback.id, status },
      {
        onSuccess: () =>
          toast.show({
            message: t('feedback.admin.statusUpdated'),
            color: 'green',
            autoClose: 1500,
          }),
        onError: (err) => {
          const message = (err as { message?: string })?.message ?? t('common.error');
          toast.show({ message, color: 'red', autoClose: 6000 });
        },
      },
    );
  }

  const authorLabel = authorName
    ? t('feedback.detail.by', { name: authorName })
    : t('feedback.detail.byUnknown');

  return (
    <Paper withBorder radius="md" p="md">
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <UnstyledButton
          onClick={() => toggle.mutate({ feedbackId: feedback.id, voted: false })}
          disabled={toggle.isPending}
          aria-label={t('feedback.voteAria')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 48,
            padding: '10px 4px',
            borderRadius: 8,
            background: 'var(--mantine-color-default-hover)',
          }}
        >
          <IconArrowUp size={18} stroke={2} />
          <Text size="sm" fw={700} lh={1.1} mt={2}>
            {feedback.votes_count}
          </Text>
        </UnstyledButton>

        <Box flex={1} miw={0}>
          <Group gap={6} wrap="wrap" mb={4}>
            <Badge size="xs" color={feedback.type === 'bug' ? 'red' : 'accent'} variant="light">
              {t(`feedback.type.${feedback.type}`)}
            </Badge>
            {!isAdmin && (
              <Badge size="xs" color={STATUS_COLOR[feedback.status]} variant="light">
                {t(`feedback.status.${feedback.status}`)}
              </Badge>
            )}
            {isOwn && (
              <Badge size="xs" color="gray" variant="dot">
                {t('feedback.byYou')}
              </Badge>
            )}
          </Group>
          <Text fw={600} size="md" mb={4}>
            {feedback.title}
          </Text>
          {feedback.body && (
            <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
              {feedback.body}
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={8}>
            {authorLabel} · {dayjs(feedback.created_at).format('D MMM YYYY')}
          </Text>

          {isAdmin && (
            <Select
              mt="sm"
              size="xs"
              label={t('feedback.admin.changeStatus')}
              value={feedback.status}
              onChange={(v) => v && handleStatusChange(v as FeedbackStatus)}
              data={allStatuses.map((s) => ({
                value: s,
                label: t(`feedback.status.${s}`),
              }))}
              disabled={updateStatus.isPending}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
          )}
        </Box>

        {isOwn && (
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            aria-label={t('feedback.form.delete')}
            onClick={handleDelete}
          >
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Group>
    </Paper>
  );
}

function CommentRow({
  comment,
  authorName,
  isOwn,
  canDelete,
  t,
}: {
  comment: FeedbackComment;
  authorName: string | null;
  isOwn: boolean;
  canDelete: boolean;
  t: TFunction;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateFeedbackComment();
  const del = useDeleteFeedbackComment();

  async function handleSave() {
    setError(null);
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(t('feedback.detail.errorEmpty'));
      return;
    }
    try {
      await update.mutateAsync({ id: comment.id, body: trimmed, feedbackId: comment.feedback_id });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedback.detail.errorSave'));
    }
  }

  function handleDelete() {
    confirmDelete({
      message: t('feedback.detail.deleteConfirm'),
      onConfirm: () => del.mutateAsync({ id: comment.id, feedbackId: comment.feedback_id }),
    });
  }

  const label = authorName
    ? t('feedback.detail.by', { name: authorName })
    : t('feedback.detail.byUnknown');

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Box flex={1} miw={0}>
          <Text size="xs" c="dimmed">
            {label} · {dayjs(comment.created_at).format('D MMM YYYY, HH:mm')}
            {comment.updated_at !== comment.created_at && ' · (editat)'}
          </Text>
          {editing ? (
            <Stack gap="xs" mt={6}>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                autosize
                minRows={2}
                placeholder={t('feedback.detail.editPlaceholder')}
                error={error}
              />
              <Group gap="xs">
                <Button size="compact-sm" onClick={handleSave} loading={update.isPending}>
                  {t('feedback.detail.editSave')}
                </Button>
                <Button
                  size="compact-sm"
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setEditing(false);
                    setDraft(comment.body);
                    setError(null);
                  }}
                >
                  {t('feedback.detail.editCancel')}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
              {comment.body}
            </Text>
          )}
        </Box>

        {!editing && (isOwn || canDelete) && (
          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Actions">
                <IconDots size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {isOwn && (
                <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
                  {t('feedback.detail.edit')}
                </Menu.Item>
              )}
              {canDelete && (
                <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={handleDelete}>
                  {t('feedback.detail.delete')}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Paper>
  );
}

function AddCommentForm({ feedbackId, t }: { feedbackId: string; t: TFunction }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = useAddFeedbackComment();

  async function handleSubmit() {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setError(t('feedback.detail.errorEmpty'));
      return;
    }
    try {
      await add.mutateAsync({ feedbackId, body: trimmed });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedback.detail.errorSave'));
    }
  }

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="xs">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          placeholder={t('feedback.detail.addPlaceholder')}
          autosize
          minRows={2}
          error={error}
        />
        <Group justify="flex-end">
          <Button
            size="compact-sm"
            onClick={handleSubmit}
            loading={add.isPending}
            disabled={!body.trim()}
          >
            {t('feedback.detail.addButton')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
