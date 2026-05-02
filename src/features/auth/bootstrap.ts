import { supabase } from '@/lib/supabase';
import { seedCategories } from '@/data/categories.seed';
import { seedSubcategories } from '@/data/subcategories.seed';
import type { User } from '@supabase/supabase-js';

/**
 * Idempotently ensure that the signed-in user has a profile + membership + seeded
 * categories and subcategories. The profile + membership creation is delegated to a
 * SECURITY DEFINER RPC (`bootstrap_profile`) which sidesteps the chicken-and-egg
 * RLS issue (you can't read your own profile until you're a member).
 */
export async function ensureProfile(user: User): Promise<{ profileId: string; created: boolean }> {
  const existing = await supabase
    .from('profile_members')
    .select('profile_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (existing.data?.profile_id) {
    return { profileId: existing.data.profile_id, created: false };
  }

  const profileName = (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Profil';

  const { data: profileId, error: rpcErr } = await supabase.rpc('bootstrap_profile', {
    profile_name: profileName,
  });
  if (rpcErr || !profileId) {
    throw rpcErr ?? new Error('Failed to bootstrap profile');
  }

  // Check whether seeding already ran for this profile (e.g. from a previous failed bootstrap)
  const { data: existingCats } = await supabase
    .from('categories')
    .select('id')
    .eq('profile_id', profileId as string)
    .limit(1);

  if (!existingCats || existingCats.length === 0) {
    await seedDefaultsForProfile(profileId as string);
  }

  return { profileId: profileId as string, created: true };
}

async function seedDefaultsForProfile(profileId: string) {
  const categoryRows = seedCategories.map((c) => ({
    profile_id: profileId,
    name: c.name,
    color: c.color,
    icon: c.icon,
    sort_order: c.sort_order,
    slug: c.slug,
    is_system: true,
  }));

  const { data: insertedCats, error: catErr } = await supabase
    .from('categories')
    .insert(categoryRows)
    .select('id, slug');
  if (catErr) throw catErr;

  const slugToId = new Map((insertedCats ?? []).map((c) => [c.slug as string, c.id as string]));

  const subRows = seedSubcategories
    .map((s) => {
      const parentId = slugToId.get(s.parent_slug);
      if (!parentId) return null;
      return {
        profile_id: profileId,
        parent_category_id: parentId,
        name: s.name,
        icon: s.icon ?? null,
        sort_order: s.sort_order,
        slug: s.slug,
        is_system: true,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (subRows.length > 0) {
    const { error: subErr } = await supabase.from('subcategories').insert(subRows);
    if (subErr) throw subErr;
  }
}
