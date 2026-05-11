/**
 * Romanian brand → category dictionary used by the smart autocomplete.
 *
 * Patterns match case-insensitively against the trimmed expense name.
 * Higher `priority` wins on conflicts (e.g. "bolt food" must beat "bolt").
 *
 * Slugs reference categories.seed.ts and subcategories.seed.ts so this file is decoupled
 * from runtime IDs (which differ per profile).
 */
export type SeedRule = {
  pattern: string;
  match_kind?: 'contains' | 'starts_with' | 'regex';
  category_slug: string;
  subcategory_slug?: string;
  tags?: string[];
  priority?: number;
};

export const seedBrandRules: SeedRule[] = [
  // Online groceries (delivered to door — separate from in-store)
  { pattern: 'freshful',     category_slug: 'food-drinks', subcategory_slug: 'online-groceries' },
  // Physical-store groceries
  { pattern: 'mega image',   category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'carrefour',    category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'kaufland',     category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'auchan',       category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'lidl',         category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'profi',        category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'penny',        category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'sana',         category_slug: 'food-drinks', subcategory_slug: 'groceries' },

  // Food delivery (specific delivery brands)
  { pattern: 'glovo',        category_slug: 'food-drinks', subcategory_slug: 'food-delivery', priority: 5 },
  { pattern: 'tazz',         category_slug: 'food-drinks', subcategory_slug: 'food-delivery', priority: 5 },
  { pattern: 'wolt',         category_slug: 'food-drinks', subcategory_slug: 'food-delivery', priority: 5 },
  { pattern: 'bolt food',    category_slug: 'food-drinks', subcategory_slug: 'food-delivery', priority: 10 },
  { pattern: 'food delivery', category_slug: 'food-drinks', subcategory_slug: 'food-delivery', priority: 8 },
  { pattern: '(food delivery)', category_slug: 'food-drinks', subcategory_slug: 'food-delivery', priority: 9 },

  // Eating out (explicit hint in expense)
  { pattern: '(eating out)', category_slug: 'food-drinks', subcategory_slug: 'eating-out', priority: 9 },
  { pattern: 'velocita',     category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'mesopotamia',  category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'hanul berarilor', category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'tacos mat',    category_slug: 'food-drinks', subcategory_slug: 'eating-out' },

  // Default for ambiguous food items: food delivery (override to eating-out with 1 tap if needed)
  { pattern: 'pizza',        category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'shaorma',      category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'burger',       category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'sushi',        category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'kfc',          category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'mcdonalds',    category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'popeyes',      category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'smash burger', category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'zen sushi',    category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'lebab',        category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'genin',        category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },
  { pattern: 'vivo burger',  category_slug: 'food-drinks', subcategory_slug: 'food-delivery' },

  // Drinks
  { pattern: '(drinks)',     category_slug: 'food-drinks', subcategory_slug: 'drinks', priority: 9 },
  { pattern: 'oktoberfest',  category_slug: 'food-drinks', subcategory_slug: 'drinks' },
  { pattern: 'bere',         category_slug: 'food-drinks', subcategory_slug: 'drinks' },
  { pattern: 'cola',         category_slug: 'food-drinks', subcategory_slug: 'drinks' },

  // Online shopping
  { pattern: 'emag',         category_slug: 'shopping',    subcategory_slug: 'online-shopping' },
  { pattern: 'amazon',       category_slug: 'shopping',    subcategory_slug: 'online-shopping' },
  { pattern: 'ikea',         category_slug: 'shopping',    subcategory_slug: 'home-goods' },

  // Transport
  { pattern: 'metrou',       category_slug: 'transport-car', subcategory_slug: 'public-transport-metro' },
  { pattern: 'abonament metrou', category_slug: 'transport-car', subcategory_slug: 'public-transport-metro', priority: 5 },
  { pattern: 'stb',          category_slug: 'transport-car', subcategory_slug: 'public-transport-bus' },
  { pattern: 'autobuz',      category_slug: 'transport-car', subcategory_slug: 'public-transport-bus' },
  { pattern: 'troleibuz',    category_slug: 'transport-car', subcategory_slug: 'public-transport-bus' },
  { pattern: 'tramvai',      category_slug: 'transport-car', subcategory_slug: 'public-transport-bus' },
  { pattern: 'cfr',          category_slug: 'transport-car', subcategory_slug: 'public-transport-train' },
  { pattern: 'tren',         category_slug: 'transport-car', subcategory_slug: 'public-transport-train' },
  { pattern: 'uber',         category_slug: 'transport-car', subcategory_slug: 'ride-sharing' },
  { pattern: 'bolt',         category_slug: 'transport-car', subcategory_slug: 'ride-sharing' }, // 'bolt food' wins via priority
  { pattern: 'blue cab',     category_slug: 'transport-car', subcategory_slug: 'ride-sharing' },
  { pattern: 'black cab',    category_slug: 'transport-car', subcategory_slug: 'ride-sharing' },
  { pattern: 'speed taxi',   category_slug: 'transport-car', subcategory_slug: 'ride-sharing' },
  { pattern: 'omv',          category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'petrom',       category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'mol',          category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'rompetrol',    category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'lukoil',       category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'benzina',      category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'spalat masina', category_slug: 'transport-car', subcategory_slug: 'car-wash' },
  { pattern: 'parcare',      category_slug: 'transport-car', subcategory_slug: 'parking' },
  { pattern: 'rca',          category_slug: 'transport-car', subcategory_slug: 'insurance' },
  { pattern: 'casco',        category_slug: 'transport-car', subcategory_slug: 'insurance' },

  // Home & Bills
  { pattern: 'chirie',       category_slug: 'home-bills',   subcategory_slug: 'rent' },
  { pattern: 'curent',       category_slug: 'home-bills',   subcategory_slug: 'electricity' },
  { pattern: 'enel',         category_slug: 'home-bills',   subcategory_slug: 'electricity' },
  { pattern: 'electrica',    category_slug: 'home-bills',   subcategory_slug: 'electricity' },
  { pattern: 'gaze',         category_slug: 'home-bills',   subcategory_slug: 'gas' },
  { pattern: 'engie',        category_slug: 'home-bills',   subcategory_slug: 'gas' },
  { pattern: 'distrigaz',    category_slug: 'home-bills',   subcategory_slug: 'gas' },
  { pattern: 'apa nova',     category_slug: 'home-bills',   subcategory_slug: 'water' },
  { pattern: 'digi',         category_slug: 'home-bills',   subcategory_slug: 'internet-tv' },
  { pattern: 'rcs',          category_slug: 'home-bills',   subcategory_slug: 'internet-tv' },
  { pattern: 'rds',          category_slug: 'home-bills',   subcategory_slug: 'internet-tv' },
  { pattern: 'orange',       category_slug: 'home-bills',   subcategory_slug: 'internet-tv' },
  { pattern: 'vodafone',     category_slug: 'home-bills',   subcategory_slug: 'internet-tv' },
  { pattern: 'reincarcare cartela', category_slug: 'home-bills', subcategory_slug: 'internet-tv', priority: 5 },
  { pattern: 'intretinere',  category_slug: 'home-bills',   subcategory_slug: 'maintenance' },

  // Subs & Digital
  { pattern: 'netflix',      category_slug: 'subs-digital', subcategory_slug: 'netflix' },
  { pattern: 'hbo',          category_slug: 'subs-digital', subcategory_slug: 'hbo' },
  { pattern: 'icloud',       category_slug: 'subs-digital', subcategory_slug: 'icloud' },
  { pattern: 'apple music',  category_slug: 'subs-digital', subcategory_slug: 'apple-music' },
  { pattern: 'youtube',      category_slug: 'subs-digital', subcategory_slug: 'youtube' },
  { pattern: 'chatgpt',      category_slug: 'subs-digital', subcategory_slug: 'chatgpt' },
  // Claude Max → work, not personal subs (per user decision)
  { pattern: 'claude',       category_slug: 'work-business', subcategory_slug: 'work-software', tags: ['subscription'] },
  { pattern: 'cursor',       category_slug: 'subs-digital', subcategory_slug: 'software' },
  { pattern: 'github',       category_slug: 'subs-digital', subcategory_slug: 'software' },

  // Health & Personal
  { pattern: 'terapie',      category_slug: 'health-personal', subcategory_slug: 'therapy' },
  { pattern: 'psiholog',     category_slug: 'health-personal', subcategory_slug: 'therapy' },
  { pattern: 'farmacie',     category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'catena',       category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'sensiblu',     category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'help net',     category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'dona',         category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'claritine',    category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'inhalator',    category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'vitamina',     category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'detartraj',    category_slug: 'health-personal', subcategory_slug: 'dentist' },
  { pattern: 'tuns',         category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'frizer',       category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'salon',        category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'ceara par',    category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'deodorant',    category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'sampon',       category_slug: 'health-personal', subcategory_slug: 'personal-care' },

  // Pets
  { pattern: 'zooplus',      category_slug: 'pets',         subcategory_slug: 'pet-food' },
  { pattern: 'mancare pisici', category_slug: 'pets',       subcategory_slug: 'pet-food' },
  { pattern: 'tri vet',      category_slug: 'pets',         subcategory_slug: 'pet-vet' },
  { pattern: 'restomyl',     category_slug: 'pets',         subcategory_slug: 'pet-vet' },
  { pattern: 'donatie pisici', category_slug: 'donations' },

  // Entertainment
  { pattern: 'cinema',       category_slug: 'entertainment', subcategory_slug: 'cinema' },
  { pattern: 'multiplex',    category_slug: 'entertainment', subcategory_slug: 'cinema' },

  // Lottery (own top-level category)
  { pattern: 'bilet loto',   category_slug: 'lottery', priority: 8 },
  { pattern: 'bilete loto',  category_slug: 'lottery', priority: 8 },
  { pattern: 'loto',         category_slug: 'lottery' },
  { pattern: 'loterie',      category_slug: 'lottery' },
  { pattern: 'loz ',         category_slug: 'lottery' },

  // Vacation — parent
  { pattern: 'vacanta',      category_slug: 'vacation' },
  { pattern: 'vacante',      category_slug: 'vacation' },
  // Vacation — flights (Bilete avion)
  { pattern: 'bilete avion', category_slug: 'vacation', subcategory_slug: 'vacation-flights', priority: 6 },
  { pattern: 'bilet avion',  category_slug: 'vacation', subcategory_slug: 'vacation-flights', priority: 6 },
  { pattern: 'avion',        category_slug: 'vacation', subcategory_slug: 'vacation-flights' },
  { pattern: 'ryanair',      category_slug: 'vacation', subcategory_slug: 'vacation-flights' },
  { pattern: 'wizz',         category_slug: 'vacation', subcategory_slug: 'vacation-flights' },
  { pattern: 'tarom',        category_slug: 'vacation', subcategory_slug: 'vacation-flights' },
  // Vacation — accommodation (Cazare)
  { pattern: 'cazare hotel', category_slug: 'vacation', subcategory_slug: 'vacation-hotel', priority: 6 },
  { pattern: 'cazare airbnb', category_slug: 'vacation', subcategory_slug: 'vacation-airbnb', priority: 6 },
  { pattern: 'airbnb',       category_slug: 'vacation', subcategory_slug: 'vacation-airbnb' },
  { pattern: 'cazare',       category_slug: 'vacation', subcategory_slug: 'vacation-hotel' },
  // Vacation — airport transport
  { pattern: 'transport aeroport', category_slug: 'vacation', subcategory_slug: 'vacation-airport-transport', priority: 6 },
  { pattern: 'aeroport',     category_slug: 'vacation' },
  // Vacation — car rental
  { pattern: 'inchiriere masina', category_slug: 'vacation', subcategory_slug: 'vacation-car-rental' },
  { pattern: 'rent a car',   category_slug: 'vacation', subcategory_slug: 'vacation-car-rental' },

  // Gifts
  { pattern: 'cadou',        category_slug: 'gifts' },
  { pattern: 'flori',        category_slug: 'gifts' },
  { pattern: 'trandafiri',   category_slug: 'gifts' },
  { pattern: 'ghiocei',      category_slug: 'gifts' },
  { pattern: 'zambile',      category_slug: 'gifts' },
  { pattern: 'martisoar',    category_slug: 'gifts' },

  // Work & Business — taxes / accounting
  { pattern: 'contabil',     category_slug: 'work-business', subcategory_slug: 'accountant' },
  { pattern: 'impozit',      category_slug: 'work-business', subcategory_slug: 'work-taxes' },
  { pattern: 'dividende',    category_slug: 'work-business', subcategory_slug: 'work-taxes' },
  { pattern: 'anaf',         category_slug: 'work-business', subcategory_slug: 'work-taxes' },

  // ---------- English patterns (alongside RO above) ----------
  // Food & Drinks
  { pattern: 'groceries',    category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'supermarket',  category_slug: 'food-drinks', subcategory_slug: 'groceries' },
  { pattern: 'restaurant',   category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'dining',       category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'lunch',        category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'dinner',       category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'coffee',       category_slug: 'food-drinks', subcategory_slug: 'eating-out' },
  { pattern: 'beer',         category_slug: 'food-drinks', subcategory_slug: 'drinks' },
  { pattern: 'wine',         category_slug: 'food-drinks', subcategory_slug: 'drinks' },

  // Transport
  { pattern: 'subway ticket', category_slug: 'transport-car', subcategory_slug: 'public-transport-metro', priority: 5 },
  { pattern: 'subway',       category_slug: 'transport-car', subcategory_slug: 'public-transport-metro' },
  { pattern: 'metro',        category_slug: 'transport-car', subcategory_slug: 'public-transport-metro' },
  { pattern: 'bus ticket',   category_slug: 'transport-car', subcategory_slug: 'public-transport-bus', priority: 5 },
  { pattern: 'bus',          category_slug: 'transport-car', subcategory_slug: 'public-transport-bus' },
  { pattern: 'tram',         category_slug: 'transport-car', subcategory_slug: 'public-transport-bus' },
  { pattern: 'train',        category_slug: 'transport-car', subcategory_slug: 'public-transport-train' },
  { pattern: 'taxi',         category_slug: 'transport-car', subcategory_slug: 'ride-sharing' },
  { pattern: 'fuel',         category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'gasoline',     category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'petrol',       category_slug: 'transport-car', subcategory_slug: 'car' },
  { pattern: 'parking',      category_slug: 'transport-car', subcategory_slug: 'parking' },
  { pattern: 'car wash',     category_slug: 'transport-car', subcategory_slug: 'car-wash', priority: 5 },
  { pattern: 'insurance',    category_slug: 'transport-car', subcategory_slug: 'insurance' },

  // Home & Bills
  { pattern: 'rent',         category_slug: 'home-bills',   subcategory_slug: 'rent' },
  { pattern: 'electricity',  category_slug: 'home-bills',   subcategory_slug: 'electricity' },
  { pattern: 'power bill',   category_slug: 'home-bills',   subcategory_slug: 'electricity', priority: 5 },
  { pattern: 'gas bill',     category_slug: 'home-bills',   subcategory_slug: 'gas', priority: 5 },
  { pattern: 'water bill',   category_slug: 'home-bills',   subcategory_slug: 'water', priority: 5 },
  { pattern: 'internet',     category_slug: 'home-bills',   subcategory_slug: 'internet-tv' },
  { pattern: 'phone bill',   category_slug: 'home-bills',   subcategory_slug: 'internet-tv', priority: 5 },
  { pattern: 'phone top-up', category_slug: 'home-bills',   subcategory_slug: 'internet-tv', priority: 5 },
  { pattern: 'mobile top-up', category_slug: 'home-bills',  subcategory_slug: 'internet-tv', priority: 5 },
  { pattern: 'maintenance fee', category_slug: 'home-bills', subcategory_slug: 'maintenance', priority: 5 },

  // Health & Personal
  { pattern: 'pharmacy',     category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'drugstore',    category_slug: 'health-personal', subcategory_slug: 'pharmacy' },
  { pattern: 'doctor',       category_slug: 'health-personal', subcategory_slug: 'doctor' },
  { pattern: 'dentist',      category_slug: 'health-personal', subcategory_slug: 'dentist' },
  { pattern: 'therapy',      category_slug: 'health-personal', subcategory_slug: 'therapy' },
  { pattern: 'therapist',    category_slug: 'health-personal', subcategory_slug: 'therapy' },
  { pattern: 'haircut',      category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'barber',       category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'shampoo',      category_slug: 'health-personal', subcategory_slug: 'personal-care' },
  { pattern: 'gym',          category_slug: 'health-personal', subcategory_slug: 'gym' },
  { pattern: 'fitness',      category_slug: 'health-personal', subcategory_slug: 'gym' },

  // Pets
  { pattern: 'pet food',     category_slug: 'pets',         subcategory_slug: 'pet-food', priority: 5 },
  { pattern: 'cat food',     category_slug: 'pets',         subcategory_slug: 'pet-food', priority: 5 },
  { pattern: 'dog food',     category_slug: 'pets',         subcategory_slug: 'pet-food', priority: 5 },
  { pattern: 'vet',          category_slug: 'pets',         subcategory_slug: 'pet-vet' },
  { pattern: 'veterinarian', category_slug: 'pets',         subcategory_slug: 'pet-vet' },
  { pattern: 'pet donation', category_slug: 'donations' },

  // Vacation
  { pattern: 'flight',       category_slug: 'vacation',     subcategory_slug: 'vacation-flights' },
  { pattern: 'plane ticket', category_slug: 'vacation',     subcategory_slug: 'vacation-flights', priority: 6 },
  { pattern: 'hotel',        category_slug: 'vacation',     subcategory_slug: 'vacation-hotel' },
  { pattern: 'airport transfer', category_slug: 'vacation', subcategory_slug: 'vacation-airport-transport', priority: 6 },
  { pattern: 'airport',      category_slug: 'vacation' },
  { pattern: 'car rental',   category_slug: 'vacation',     subcategory_slug: 'vacation-car-rental', priority: 5 },
  { pattern: 'vacation',     category_slug: 'vacation' },
  { pattern: 'holiday',      category_slug: 'vacation' },

  // Gifts
  { pattern: 'gift',         category_slug: 'gifts' },
  { pattern: 'flowers',      category_slug: 'gifts' },
  { pattern: 'roses',        category_slug: 'gifts' },

  // Lottery
  { pattern: 'lottery ticket', category_slug: 'lottery', priority: 8 },
  { pattern: 'lottery',      category_slug: 'lottery' },
  { pattern: 'scratch card', category_slug: 'lottery', priority: 5 },

  // Entertainment
  { pattern: 'movie',        category_slug: 'entertainment', subcategory_slug: 'cinema' },
  { pattern: 'concert',      category_slug: 'entertainment', subcategory_slug: 'events' },

  // Shopping
  { pattern: 'clothes',      category_slug: 'shopping',    subcategory_slug: 'clothes' },
  { pattern: 'clothing',     category_slug: 'shopping',    subcategory_slug: 'clothes' },
  { pattern: 'electronics',  category_slug: 'shopping',    subcategory_slug: 'electronics' },
  { pattern: 'furniture',    category_slug: 'shopping',    subcategory_slug: 'furniture' },
  { pattern: 'online order', category_slug: 'shopping',    subcategory_slug: 'online-shopping' },

  // Work & Business
  { pattern: 'accountant',   category_slug: 'work-business', subcategory_slug: 'accountant' },
  { pattern: 'accounting',   category_slug: 'work-business', subcategory_slug: 'accountant' },
  { pattern: 'income tax',   category_slug: 'work-business', subcategory_slug: 'work-taxes', priority: 5 },
  { pattern: 'tax payment',  category_slug: 'work-business', subcategory_slug: 'work-taxes', priority: 5 },
  { pattern: 'dividend',     category_slug: 'work-business', subcategory_slug: 'work-taxes' },
  { pattern: 'course',       category_slug: 'work-business', subcategory_slug: 'courses' },
];
