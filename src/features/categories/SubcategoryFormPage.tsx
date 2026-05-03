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
import { ColorPicker } from '@/components/ColorPicker';
import { IconPicker } from '@/components/IconPicker';
import { categoryColors, getIcon } from '@/data/icons.registry';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import {
  useCategories,
  useDeleteSubcategory,
  useSubcategories,
  useUpsertSubcategory,
} from './api';

export function SubcategoryFormPage() {
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
          Subcategoria nu a fost găsită.
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
      setError('Alege o categorie părinte');
      return;
    }
    if (!name.trim()) {
      setError('Numele e obligatoriu');
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
      navigate(`/categories/${parentId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!editing) return;
    confirmDelete({
      message:
        'Subcategoria va fi ștearsă. Cheltuielile asociate vor rămâne în categoria părinte fără subcategorie.',
      onConfirm: async () => {
        try {
          await del.mutateAsync(editing.id);
          navigate(`/categories/${editing.parent_category_id}/edit`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Eroare la ștergere');
        }
      },
    });
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" align="center">
          <Button
            variant="subtle"
            color="gray"
            onClick={() =>
              parentId
                ? navigate(`/categories/${parentId}/edit`)
                : navigate('/categories')
            }
            leftSection={<IconArrowLeft size={16} />}
            size="compact-sm"
          >
            Înapoi
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
            {isNew ? 'Subcategorie nouă' : editing?.name}
          </Title>
        </Group>

        <Select
          label="Categoria părinte"
          required
          searchable
          filter={diacriticsFilter}
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={parentId}
          onChange={(v) => setParentId(v)}
        />

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Cafenele"
        />

        <Box>
          <Text size="sm" fw={500} mb={6}>
            Icon
          </Text>
          <IconPicker value={icon} onChange={setIcon} color={effectiveColor} />
        </Box>

        <Switch
          checked={overrideColor}
          onChange={(e) => setOverrideColor(e.currentTarget.checked)}
          label="Suprascrie culoarea categoriei părinte"
        />
        {overrideColor && (
          <Box>
            <Text size="sm" fw={500} mb={6}>
              Culoare
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
            {isNew ? 'Creează' : 'Salvează'}
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
              Șterge subcategoria
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
