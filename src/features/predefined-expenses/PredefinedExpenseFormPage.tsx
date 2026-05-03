import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { confirmDelete } from '@/lib/confirm';
import { useCategories, useSubcategories } from '@/features/categories/api';
import {
  useDeletePredefined,
  usePredefinedExpense,
  useUpsertPredefined,
} from './api';

export function PredefinedExpenseFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = usePredefinedExpense(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertPredefined();
  const del = useDeletePredefined();

  const [name, setName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('RON');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = editing.data;
    if (!t) return;
    setName(t.name);
    setDefaultCurrency(t.default_currency);
    setCategoryId(t.category_id);
    setSubcategoryId(t.subcategory_id);
    setActive(t.active);
  }, [editing.data]);

  if (!isNew && editing.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const childSubs = (subs.data ?? []).filter((s) => s.parent_category_id === categoryId);

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError('Nume e obligatoriu');
    if (!categoryId) return setError('Alege o categorie');
    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        default_currency: defaultCurrency,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        icon: null,
        active,
      });
      navigate('/predefined-expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi acest șablon?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/predefined-expenses');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Eroare la ștergere');
        }
      },
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
            onClick={() => navigate('/predefined-expenses')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Șablon predefinit nou' : name}</Title>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Comandă Freshful"
        />

        <Select
          label="Monedă implicită"
          data={CURRENCIES.map((c) => ({ value: c, label: c }))}
          value={defaultCurrency}
          onChange={(v) => setDefaultCurrency((v as Currency) ?? 'RON')}
          allowDeselect={false}
        />

        <Select
          label="Categorie"
          required
          searchable
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setSubcategoryId(null);
          }}
        />

        {childSubs.length > 0 && (
          <Select
            label="Subcategorie (opțional)"
            data={[
              { value: '', label: 'Fără subcategorie' },
              ...childSubs.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={subcategoryId ?? ''}
            onChange={(v) => setSubcategoryId(v && v !== '' ? v : null)}
          />
        )}

        <Switch
          label="Activ"
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? 'Creează' : 'Salvează'}
        </Button>

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
              Șterge șablonul
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
