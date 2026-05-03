import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { ColorPicker } from '@/components/ColorPicker';
import { IconPicker } from '@/components/IconPicker';
import { categoryColors, getIcon } from '@/data/icons.registry';
import { confirmDelete } from '@/lib/confirm';
import {
  useCategories,
  useDeleteCategory,
  useSubcategories,
  useUpsertCategory,
} from './api';
import { SubcategoryRow } from './SubcategoryRow';

export function CategoryFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertCategory();
  const del = useDeleteCategory();

  const editing = !isNew ? (cats.data ?? []).find((c) => c.id === params.id) ?? null : null;

  const [name, setName] = useState('');
  const [color, setColor] = useState(categoryColors[0]);
  const [icon, setIcon] = useState('IconCategory');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setColor(editing.color);
      setIcon(editing.icon);
    }
  }, [editing]);

  if (!isNew && cats.isLoading) {
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
          Categoria nu a fost găsită.
        </Alert>
      </Container>
    );
  }

  const childSubs = !isNew && editing
    ? (subs.data ?? []).filter((s) => s.parent_category_id === editing.id)
    : [];

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError('Numele e obligatoriu');
      return;
    }
    try {
      const result = await upsert.mutateAsync({
        id: editing ? editing.id : undefined,
        name: name.trim(),
        color,
        icon,
        sort_order: editing?.sort_order,
      });
      if (isNew) {
        navigate(`/categories/${result.id}/edit`, { replace: true });
      } else {
        navigate('/categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!editing) return;
    confirmDelete({
      message:
        'Categoria și toate subcategoriile ei vor fi șterse. Cheltuielile asociate vor rămâne în listă, fără categorie. Sigur vrei să continui?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(editing.id);
          navigate('/categories');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Eroare la ștergere');
        }
      },
    });
  }

  const Icon = getIcon(icon);

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" align="center">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => navigate('/categories')}
            leftSection={<IconArrowLeft size={16} />}
            size="compact-sm"
          >
            Înapoi
          </Button>
        </Group>
        <Group gap="md" align="center">
          <Box
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `${color}33`,
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={28} stroke={2} />
          </Box>
          <Title order={2} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isNew ? 'Categorie nouă' : editing?.name}
          </Title>
        </Group>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Vacanțe"
        />

        <Box>
          <Text size="sm" fw={500} mb={6}>
            Culoare
          </Text>
          <ColorPicker value={color} onChange={setColor} />
        </Box>

        <Box>
          <Text size="sm" fw={500} mb={6}>
            Icon
          </Text>
          <IconPicker value={icon} onChange={setIcon} color={color} />
        </Box>

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

        {!isNew && editing && (
          <>
            <Divider label="Subcategorii" labelPosition="center" my="md" />
            <Stack gap="xs">
              {childSubs.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  Nu ai subcategorii. Adaugă una pentru a clasifica mai fin.
                </Text>
              )}
              {childSubs.map((sub) => (
                <SubcategoryRow key={sub.id} subcategory={sub} parentColor={color} />
              ))}
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => navigate(`/subcategories/new?parent=${editing.id}`)}
              >
                Adaugă subcategorie
              </Button>
            </Stack>
            <Divider my="md" />
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleDelete}
              loading={del.isPending}
            >
              Șterge categoria
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
