/**
 * Default categories seeded into a new profile. Each gets a slug for stable rule references
 * (slugs never change; names/colors/icons can be edited by the user).
 */
export type SeedCategory = {
  slug: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
};

export const seedCategories: SeedCategory[] = [
  { slug: 'food-drinks',    name: 'Mâncare & Băuturi',         color: '#f97316', icon: 'IconToolsKitchen2',  sort_order: 1 },
  { slug: 'transport-car',  name: 'Transport & Mașină',        color: '#3b82f6', icon: 'IconCar',            sort_order: 2 },
  { slug: 'home-bills',     name: 'Casă & Facturi',            color: '#8b5cf6', icon: 'IconHome',           sort_order: 3 },
  { slug: 'shopping',       name: 'Cumpărături',               color: '#ec4899', icon: 'IconShoppingBag',    sort_order: 4 },
  { slug: 'subs-digital',   name: 'Abonamente & Digital',      color: '#06b6d4', icon: 'IconDeviceMobile',   sort_order: 5 },
  { slug: 'health-personal',name: 'Sănătate & Personal',       color: '#22c55e', icon: 'IconHeartbeat',      sort_order: 6 },
  { slug: 'entertainment',  name: 'Divertisment & Lifestyle',  color: '#eab308', icon: 'IconMovie',          sort_order: 7 },
  { slug: 'work-business',  name: 'Muncă & Business',          color: '#64748b', icon: 'IconBriefcase',      sort_order: 8 },
  { slug: 'finance',        name: 'Finanțe',                   color: '#0ea5e9', icon: 'IconCoin',           sort_order: 9 },
  { slug: 'gifts',          name: 'Cadouri',                   color: '#f43f5e', icon: 'IconGift',           sort_order: 10 },
  { slug: 'donations',      name: 'Donații',                   color: '#a855f7', icon: 'IconHeart',          sort_order: 11 },
  { slug: 'pets',           name: 'Animale',                   color: '#84cc16', icon: 'IconPaw',            sort_order: 12 },
  { slug: 'vacation',       name: 'Vacanță',                   color: '#14b8a6', icon: 'IconPlane',          sort_order: 13 },
  { slug: 'adoption',       name: 'Adopție',                   color: '#f59e0b', icon: 'IconBabyCarriage',   sort_order: 14 },
  { slug: 'misc',           name: 'Diverse',                   color: '#94a3b8', icon: 'IconDots',           sort_order: 15 },
];
