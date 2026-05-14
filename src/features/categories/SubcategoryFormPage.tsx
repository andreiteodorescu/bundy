import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from '@/components/ColorPicker';
import { IconPicker } from '@/components/IconPicker';
import { categoryColors, getIcon } from '@/data/icons.registry';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import {
  useCategories,
  useDeleteSubcategory,
  useSubcategories,
  useUpsertSubcategory,
} from './api';

export function SubcategoryFormPage() {
  const { t } = useTranslation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertSubcategory();
  const del = useDeleteSubcategory();

  const editing = !isNew ? (subs.data ?? []).find((s) => s.id === params.id) ?? null : null;

  const [parentId, setParentId] = useState<string | null>(searchParams.get('parent'));
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('IconCategory');
  const [overrideColor, setOverrideColor] = useState(false);
  const [color, setColor] = useState<string>(categoryColors[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setParentId(editing.parent_category_id);
      setName(editing.name);
      setIcon(editing.icon ?? 'IconCategory');
      setOverrideColor(editing.color !== null);
      setColor(editing.color ?? categoryColors[0]);
    }
  }, [editing]);

  if (!isNew && subs.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  if (!isNew && !editing) {
    return (
      <Container size="sm" py="md">
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {t('categories.subcategoryForm.notFound')}
        </Alert>
      </Container>
    );
  }

  const parent = (cats.data ?? []).find((c) => c.id === parentId);
  const effectiveColor = overrideColor ? color : (parent?.color ?? categoryColors[0]);
  const Icon = getIcon(icon);

  async function handleSave() {
    setError(null);
    if (!parentId) {
      setError(t('categories.subcategoryForm.errorParentRequired'));
      return;
    }
    if (!name.trim()) {
      setError(t('categories.subcategoryForm.errorNameRequired'));
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing ? editing.id : undefined,
        parent_category_id: parentId,
        name: name.trim(),
        icon: icon || null,
        color: overrideColor ? color : null,
        sort_order: editing?.sort_order,
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.subcategoryForm.errorSave'));
    }
  }

  function handleDelete() {
    if (!editing) return;
    confirmDelete({
      message: t('categories.subcategoryForm.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(editing.id);
          navigate(-1);
        } catch (err) {
          setError(err instanceof Error ? err.message : t('categories.subcategoryForm.errorDelete'));
        }
      },
    });
  }

  const editingDisplayName = editing ? subcategoryDisplayName(editing, t) : '';

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" align="center">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => navigate(-1)}
            leftSection={<IconArrowLeft size={16} />}
            size="compact-sm"
          >
            {t('categories.back')}
          </Button>
        </Group>

        <Group gap="md" align="center">
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${effectiveColor}33`,
              color: effectiveColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={24} stroke={2} />
          </Box>
          <Title order={3} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isNew ? t('categories.subcategoryForm.newTitle') : editingDisplayName}
          </Title>
        </Group>

        <Select
          label={t('categories.subcategoryForm.parent')}
          required
          searchable
          filter={diacriticsFilter}
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: categoryDisplayName(c, t) }))}
          value={parentId}
          onChange={(v) => setParentId(v)}
        />

        <TextInput
          label={t('categories.subcategoryForm.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('categories.subcategoryForm.namePlaceholder')}
        />

        <Box>
          <Text size="sm" fw={500} mb={6}>
            {t('categories.subcategoryForm.icon')}
          </Text>
          <IconPicker value={icon} onChange={setIcon} color={effectiveColor} />
        </Box>

        <Switch
          checked={overrideColor}
          onChange={(e) => setOverrideColor(e.currentTarget.checked)}
          label={t('categories.subcategoryForm.overrideColor')}
        />
        {overrideColor && (
          <Box>
            <Text size="sm" fw={500} mb={6}>
              {t('categories.subcategoryForm.color')}
            </Text>
            <ColorPicker value={color} onChange={setColor} />
          </Box>
        )}

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Group grow>
          <Button onClick={handleSave} loading={upsert.isPending} size="md">
            {isNew ? t('categories.subcategoryForm.create') : t('categories.subcategoryForm.submit')}
          </Button>
        </Group>

        {!isNew && (
          <>
            <Divider my="md" />
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleDelete}
              loading={del.isPending}
            >
              {t('categories.subcategoryForm.delete')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
