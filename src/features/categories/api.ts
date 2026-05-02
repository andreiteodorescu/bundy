import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Category, Subcategory } from '@/types';

export const CATEGORIES_KEY = ['categories'] as const;
export const SUBCATEGORIES_KEY = ['subcategories'] as const;

export function useCategories() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...CATEGORIES_KEY, profileId],
    enabled: Boolean(profileId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useSubcategories() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...SUBCATEGORIES_KEY, profileId],
    enabled: Boolean(profileId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Subcategory[]> => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subcategory[];
    },
  });
}

type UpsertCategoryInput = {
  id?: string;
  name: string;
  color: string;
  icon: string;
  sort_order?: number;
};

export function useUpsertCategory() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertCategoryInput): Promise<Category> => {
      if (!profileId) throw new Error('No profile selected');
      if (input.id) {
        const { data, error } = await supabase
          .from('categories')
          .update({
            name: input.name,
            color: input.color,
            icon: input.icon,
            ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
          })
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Category;
      }
      const { data, error } = await supabase
        .from('categories')
        .insert({
          profile_id: profileId,
          name: input.name,
          color: input.color,
          icon: input.icon,
          sort_order: input.sort_order ?? 999,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      qc.invalidateQueries({ queryKey: SUBCATEGORIES_KEY });
    },
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('categories').update({ sort_order: index }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

type UpsertSubcategoryInput = {
  id?: string;
  parent_category_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order?: number;
};

export function useUpsertSubcategory() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertSubcategoryInput): Promise<Subcategory> => {
      if (!profileId) throw new Error('No profile selected');
      if (input.id) {
        const { data, error } = await supabase
          .from('subcategories')
          .update({
            parent_category_id: input.parent_category_id,
            name: input.name,
            icon: input.icon,
            color: input.color,
            ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
          })
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Subcategory;
      }
      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          profile_id: profileId,
          parent_category_id: input.parent_category_id,
          name: input.name,
          icon: input.icon,
          color: input.color,
          sort_order: input.sort_order ?? 999,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as Subcategory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBCATEGORIES_KEY }),
  });
}

export function useDeleteSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subcategories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBCATEGORIES_KEY }),
  });
}

export function useReorderSubcategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('subcategories').update({ sort_order: index }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBCATEGORIES_KEY }),
  });
}
