/**
 * Seed historical expenses (Feb/Mar/Apr 2026) into Supabase.
 *
 * Run with:  npm run seed:historical
 *
 * Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (so this bypasses RLS
 * and can write into any profile). Targets the FIRST profile in the database — if you
 * have multiple profiles, edit `targetProfileId` below.
 *
 * Idempotent: skips an item if a manual expense with the same name + date + amount
 * already exists for that profile.
 *
 * Auto-categorization order:
 *   1. explicit `hint` on the item (categorySlug, subcategorySlug)
 *   2. brand_rules from src/data/brandRules.seed.ts (longest-pattern-first)
 *   3. fallback: `misc` category (Miscellaneous)
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first (Vite convention), then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { historicalExpenses, type HistoricalItem } from './historical-data';
import { seedBrandRules } from '../src/data/brandRules.seed';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // Pick target profile (first one)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1);
  if (pErr || !profiles || profiles.length === 0) {
    console.error('No profile found. Login to the app first to bootstrap one.');
    process.exit(1);
  }
  const targetProfileId = profiles[0].id;
  console.log(`Target profile: ${profiles[0].name} (${targetProfileId})`);

  // Load profile categories + subcategories so we can resolve slugs → ids
  const [{ data: cats }, { data: subs }] = await Promise.all([
    supabase.from('categories').select('id, slug, name').eq('profile_id', targetProfileId),
    supabase.from('subcategories').select('id, slug, name, parent_category_id').eq('profile_id', targetProfileId),
  ]);
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c]));
  const subBySlug = new Map((subs ?? []).map((s) => [s.slug as string, s]));

  // Sort brand rules: longer patterns first (so "bolt food" wins over "bolt")
  const sortedRules = [...seedBrandRules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.pattern.length - a.pattern.length,
  );

  let created = 0;
  let skipped = 0;
  let uncategorized = 0;
  const monthTotals: Record<string, number> = {};

  for (const item of historicalExpenses) {
    const month = item.date.slice(0, 7);
    monthTotals[month] = (monthTotals[month] ?? 0) + item.amount;

    // Idempotency check: skip if expense exists with same name+date+amount
    const existing = await supabase
      .from('expenses')
      .select('id')
      .eq('profile_id', targetProfileId)
      .eq('name', item.name)
      .eq('occurred_on', item.date)
      .eq('amount_original', item.amount)
      .limit(1)
      .maybeSingle();
    if (existing.data) {
      skipped++;
      continue;
    }

    const { categorySlug, subcategorySlug } = resolveCategory(item, sortedRules);
    if (!categorySlug) uncategorized++;

    const cat = categorySlug ? catBySlug.get(categorySlug) : null;
    const sub = subcategorySlug ? subBySlug.get(subcategorySlug) : null;

    const { error } = await supabase.from('expenses').insert({
      profile_id: targetProfileId,
      name: item.name,
      amount_original: item.amount,
      currency_original: item.currency,
      amount_ron: item.currency === 'RON' ? item.amount : item.amount, // historical: same as original
      occurred_on: item.date,
      category_id: cat?.id ?? catBySlug.get('misc')?.id ?? null,
      subcategory_id: sub?.id ?? null,
      tags: item.hint?.tags ?? [],
      source: 'manual',
    });
    if (error) {
      console.error(`  ✗ ${item.date} ${item.name}: ${error.message}`);
      continue;
    }
    created++;
  }

  console.log(`\n✓ Created ${created} expenses, skipped ${skipped} (already existed)`);
  if (uncategorized > 0) console.log(`⚠ ${uncategorized} expenses fell back to Miscellaneous`);
  console.log('\nMonthly totals (lei):');
  for (const [m, t] of Object.entries(monthTotals).sort()) {
    console.log(`  ${m}: ${t.toFixed(2)} lei`);
  }
  console.log('\nExpected: 2026-02: 8051, 2026-03: 12711, 2026-04: 10875');
}

function resolveCategory(
  item: HistoricalItem,
  rules: typeof seedBrandRules,
): { categorySlug?: string; subcategorySlug?: string } {
  if (item.hint?.categorySlug || item.hint?.subcategorySlug) {
    return { categorySlug: item.hint.categorySlug, subcategorySlug: item.hint.subcategorySlug };
  }
  const lc = item.name.toLowerCase();
  for (const rule of rules) {
    if (lc.includes(rule.pattern.toLowerCase())) {
      return { categorySlug: rule.category_slug, subcategorySlug: rule.subcategory_slug };
    }
  }
  return {};
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
