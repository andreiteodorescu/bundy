import type { TFunction } from 'i18next';
import type { Category, Subcategory } from '@/types';

/**
 * Returns the localized display name for a category. System categories use
 * `categories.names.<slug>` from the locale files; user-created entries
 * (no slug or unknown slug) fall back to the DB `name` column as-is.
 */
export function categoryDisplayName(category: Pick<Category, 'name' | 'slug'>, t: TFunction): string {
  if (!category.slug) return category.name;
  const key = `categories.names.${category.slug}`;
  const translated = t(key);
  return translated === key ? category.name : translated;
}

export function subcategoryDisplayName(
  subcategory: Pick<Subcategory, 'name' | 'slug'>,
  t: TFunction,
): string {
  if (!subcategory.slug) return subcategory.name;
  const key = `subcategories.names.${subcategory.slug}`;
  const translated = t(key);
  return translated === key ? subcategory.name : translated;
}

/**
 * Lookup helpers for animal avatar labels and investment instrument types.
 * Same pattern: use the canonical key, fall back to the raw value.
 */
export function animalDisplayName(iconName: string, t: TFunction): string {
  const key = `animals.${iconName}`;
  const translated = t(key);
  return translated === key ? iconName : translated;
}

export function instrumentTypeDisplayName(type: string, t: TFunction): string {
  const key = `investments.types.${type}`;
  const translated = t(key);
  return translated === key ? type : translated;
}
