export type SeedSubcategory = {
  slug: string;
  parent_slug: string;
  name: string;
  icon?: string;
  sort_order: number;
};

export const seedSubcategories: SeedSubcategory[] = [
  // Food & Drinks
  { slug: 'groceries',      parent_slug: 'food-drinks',     name: 'Băcănie',               icon: 'IconShoppingCart',     sort_order: 1 },
  { slug: 'eating-out',     parent_slug: 'food-drinks',     name: 'În oraș',               icon: 'IconToolsKitchen3',    sort_order: 2 },
  { slug: 'food-delivery',  parent_slug: 'food-drinks',     name: 'Livrare mâncare',       icon: 'IconTruckDelivery',    sort_order: 3 },
  { slug: 'drinks',         parent_slug: 'food-drinks',     name: 'Băuturi',               icon: 'IconGlass',            sort_order: 4 },
  // Transport & Car
  { slug: 'car',            parent_slug: 'transport-car',   name: 'Mașină (combustibil)',  icon: 'IconGasStation',       sort_order: 1 },
  { slug: 'parking',        parent_slug: 'transport-car',   name: 'Parcare',               icon: 'IconParking',          sort_order: 2 },
  { slug: 'public-transport', parent_slug: 'transport-car', name: 'Transport public',      icon: 'IconBusStop',          sort_order: 3 },
  { slug: 'ride-sharing',   parent_slug: 'transport-car',   name: 'Ride sharing',          icon: 'IconCarSuv',           sort_order: 4 },
  { slug: 'insurance',      parent_slug: 'transport-car',   name: 'Asigurări',             icon: 'IconShield',           sort_order: 5 },
  { slug: 'car-wash',       parent_slug: 'transport-car',   name: 'Spălat mașină',         icon: 'IconDroplet',          sort_order: 6 },
  // Home & Bills
  { slug: 'rent',           parent_slug: 'home-bills',      name: 'Chirie',                icon: 'IconKey',              sort_order: 1 },
  { slug: 'electricity',    parent_slug: 'home-bills',      name: 'Curent',                icon: 'IconBolt',             sort_order: 2 },
  { slug: 'gas',            parent_slug: 'home-bills',      name: 'Gaze',                  icon: 'IconFlame',            sort_order: 3 },
  { slug: 'water',          parent_slug: 'home-bills',      name: 'Apă',                   icon: 'IconDroplet',          sort_order: 4 },
  { slug: 'internet-tv',    parent_slug: 'home-bills',      name: 'Internet / TV',         icon: 'IconWifi',             sort_order: 5 },
  { slug: 'maintenance',    parent_slug: 'home-bills',      name: 'Întreținere',           icon: 'IconBuildingCommunity', sort_order: 6 },
  { slug: 'repairs',        parent_slug: 'home-bills',      name: 'Reparații',             icon: 'IconTool',             sort_order: 7 },
  // Shopping
  { slug: 'clothes',        parent_slug: 'shopping',        name: 'Haine',                 icon: 'IconShirt',            sort_order: 1 },
  { slug: 'electronics',    parent_slug: 'shopping',        name: 'Electronice',           icon: 'IconDeviceLaptop',     sort_order: 2 },
  { slug: 'home-goods',     parent_slug: 'shopping',        name: 'Articole casnice',      icon: 'IconArmchair',         sort_order: 3 },
  { slug: 'furniture',      parent_slug: 'shopping',        name: 'Mobilier',              icon: 'IconSofa',             sort_order: 4 },
  { slug: 'online-shopping', parent_slug: 'shopping',       name: 'Cumpărături online',    icon: 'IconShoppingCart',     sort_order: 5 },
  // Subs & Digital — proper brand names stay
  { slug: 'netflix',        parent_slug: 'subs-digital',    name: 'Netflix',               icon: 'IconBrandNetflix',     sort_order: 1 },
  { slug: 'hbo',            parent_slug: 'subs-digital',    name: 'HBO',                   icon: 'IconMovie',            sort_order: 2 },
  { slug: 'icloud',         parent_slug: 'subs-digital',    name: 'iCloud',                icon: 'IconCloud',            sort_order: 3 },
  { slug: 'apple-music',    parent_slug: 'subs-digital',    name: 'Apple Music',           icon: 'IconBrandApple',       sort_order: 4 },
  { slug: 'youtube',        parent_slug: 'subs-digital',    name: 'YouTube Premium',       icon: 'IconBrandYoutube',     sort_order: 5 },
  { slug: 'claude',         parent_slug: 'subs-digital',    name: 'Claude',                icon: 'IconRobot',            sort_order: 6 },
  { slug: 'chatgpt',        parent_slug: 'subs-digital',    name: 'ChatGPT',               icon: 'IconBrandOpenai',      sort_order: 7 },
  { slug: 'software',       parent_slug: 'subs-digital',    name: 'Software',              icon: 'IconCode',             sort_order: 8 },
  { slug: 'apps',           parent_slug: 'subs-digital',    name: 'Aplicații',             icon: 'IconApps',             sort_order: 9 },
  // Health & Personal
  { slug: 'pharmacy',       parent_slug: 'health-personal', name: 'Farmacie',              icon: 'IconPill',             sort_order: 1 },
  { slug: 'doctor',         parent_slug: 'health-personal', name: 'Medic',                 icon: 'IconStethoscope',      sort_order: 2 },
  { slug: 'dentist',        parent_slug: 'health-personal', name: 'Dentist',               icon: 'IconDental',           sort_order: 3 },
  { slug: 'therapy',        parent_slug: 'health-personal', name: 'Terapie',               icon: 'IconBrain',            sort_order: 4 },
  { slug: 'gym',            parent_slug: 'health-personal', name: 'Sală / Fitness',        icon: 'IconBarbell',          sort_order: 5 },
  { slug: 'personal-care',  parent_slug: 'health-personal', name: 'Îngrijire personală',   icon: 'IconScissors',         sort_order: 6 },
  // Entertainment
  { slug: 'cinema',         parent_slug: 'entertainment',   name: 'Filme / Cinema',        icon: 'IconMovie',            sort_order: 1 },
  { slug: 'events',         parent_slug: 'entertainment',   name: 'Evenimente / Concerte', icon: 'IconTicket',           sort_order: 2 },
  { slug: 'hobbies',        parent_slug: 'entertainment',   name: 'Hobby-uri',             icon: 'IconPalette',          sort_order: 3 },
  // Vacation
  { slug: 'travel',         parent_slug: 'vacation',        name: 'Călătorii / Vacanțe',   icon: 'IconPlaneTilt',        sort_order: 1 },
  // Pets
  { slug: 'pet-food',       parent_slug: 'pets',            name: 'Mâncare & Accesorii',   icon: 'IconBowl',             sort_order: 1 },
  { slug: 'pet-vet',        parent_slug: 'pets',            name: 'Veterinar',             icon: 'IconStethoscope',      sort_order: 2 },
  // Finance
  { slug: 'savings',        parent_slug: 'finance',         name: 'Economii',              icon: 'IconPigMoney',         sort_order: 1 },
  { slug: 'investments',    parent_slug: 'finance',         name: 'Investiții',            icon: 'IconChartLine',        sort_order: 2 },
  { slug: 'taxes',          parent_slug: 'finance',         name: 'Taxe & Impozite',       icon: 'IconReceiptTax',       sort_order: 3 },
  { slug: 'loans',          parent_slug: 'finance',         name: 'Credite',               icon: 'IconCreditCard',       sort_order: 4 },
  { slug: 'accountant',     parent_slug: 'finance',         name: 'Contabil',              icon: 'IconCalculator',       sort_order: 5 },
  // Work
  { slug: 'work-software',  parent_slug: 'work-business',   name: 'Software',              icon: 'IconCode',             sort_order: 1 },
  { slug: 'courses',        parent_slug: 'work-business',   name: 'Cursuri / Învățare',    icon: 'IconSchool',           sort_order: 2 },
];
