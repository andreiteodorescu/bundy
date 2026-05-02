/**
 * 3 luni de cheltuieli notate de user în Notes pe Feb/Mar/Apr 2026.
 *
 * Notes:
 * - Datele exacte ale fiecărei zile nu erau în input. Am asignat fiecărui item o dată
 *   reprezentativă în interiorul săptămânii notate de user (de obicei mid-week).
 * - Pentru "Săpt 1 extinsă 30 ian - 8 feb" am pus toate items la o dată în Feb 1-8 ca
 *   să apară în totalul lunii februarie (8051 lei) pe care a calculat-o user-ul.
 * - Numele s-au păstrat exact ca în input (lowercase + diacritice românești unde au fost).
 * - Items care au tag explicit (ex. "(food delivery)", "(eating out)") rămân ca atare
 *   pentru a permite brand_rules să le pre-categorizeze corect.
 */
export type HistoricalItem = {
  date: string; // YYYY-MM-DD
  name: string;
  amount: number;
  currency: 'RON' | 'EUR' | 'USD';
  hint?: { categorySlug?: string; subcategorySlug?: string; tags?: string[] };
};

export const historicalExpenses: HistoricalItem[] = [
  // ============= FEBRUARIE 2026 =============
  // Săpt 1 extinsă 30 ian - 8 feb (puse în Feb)
  { date: '2026-02-02', name: 'Freshful', amount: 254, currency: 'RON' },
  { date: '2026-02-03', name: 'Mega image', amount: 57, currency: 'RON' },
  { date: '2026-02-04', name: 'Multiplex', amount: 26, currency: 'RON', hint: { categorySlug: 'entertainment', subcategorySlug: 'cinema' } },
  { date: '2026-02-04', name: 'Bilete loto', amount: 17, currency: 'RON' },
  { date: '2026-02-05', name: 'Uber', amount: 22, currency: 'RON' },
  { date: '2026-02-05', name: 'Mega image', amount: 85, currency: 'RON' },
  { date: '2026-02-06', name: 'Shaorma', amount: 39, currency: 'RON' },
  { date: '2026-02-06', name: 'Cola', amount: 6, currency: 'RON' },
  { date: '2026-02-07', name: 'Mega image', amount: 61, currency: 'RON' },
  { date: '2026-02-08', name: 'iCloud', amount: 50, currency: 'RON' },

  // Săpt 2 (9-15 feb)
  { date: '2026-02-09', name: 'Uber', amount: 22, currency: 'RON' },
  { date: '2026-02-09', name: 'Digi internet și cablu TV', amount: 220, currency: 'RON' },
  { date: '2026-02-10', name: 'Freshful', amount: 322, currency: 'RON' },
  { date: '2026-02-10', name: 'Chirie redusă + gaze', amount: 1800, currency: 'RON' },
  { date: '2026-02-10', name: 'Bilet loto', amount: 17, currency: 'RON' },
  { date: '2026-02-11', name: 'Terapie', amount: 300, currency: 'RON' },
  { date: '2026-02-11', name: 'Tuns', amount: 130, currency: 'RON' },
  { date: '2026-02-11', name: 'Pateuri', amount: 16, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'eating-out' } },
  { date: '2026-02-12', name: 'Comandă Emag', amount: 228, currency: 'RON' },
  { date: '2026-02-12', name: 'Mega image', amount: 57, currency: 'RON' },
  { date: '2026-02-13', name: 'Uber', amount: 25, currency: 'RON' },
  { date: '2026-02-13', name: 'Ghiocei', amount: 15, currency: 'RON' },
  { date: '2026-02-13', name: 'Pasteis de nata', amount: 9, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'eating-out' } },
  { date: '2026-02-14', name: 'Tacos MAT (eating out)', amount: 179, currency: 'RON' },
  { date: '2026-02-14', name: 'Uber', amount: 25, currency: 'RON' },
  { date: '2026-02-14', name: 'Trandafiri', amount: 60, currency: 'RON' },
  { date: '2026-02-14', name: 'Metrou', amount: 20, currency: 'RON' },
  { date: '2026-02-15', name: 'Pizza (food delivery)', amount: 100, currency: 'RON' },

  // Săpt 3 (16-22 feb)
  { date: '2026-02-16', name: 'Freshful', amount: 240, currency: 'RON' },
  { date: '2026-02-16', name: 'Reincărcare cartelă Vodafone', amount: 40, currency: 'RON' },
  { date: '2026-02-17', name: 'Comandă Zooplus', amount: 590, currency: 'RON' },
  { date: '2026-02-17', name: 'Cadou Ana', amount: 400, currency: 'RON', hint: { categorySlug: 'gifts' } },
  { date: '2026-02-17', name: 'Bilet loto', amount: 26, currency: 'RON' },
  { date: '2026-02-18', name: 'Terapie', amount: 300, currency: 'RON' },
  { date: '2026-02-19', name: 'McDonalds (eating out)', amount: 42, currency: 'RON' },
  { date: '2026-02-19', name: 'Trandafiri', amount: 50, currency: 'RON' },
  { date: '2026-02-20', name: 'Metrou', amount: 40, currency: 'RON' },
  { date: '2026-02-21', name: 'KFC (eating out)', amount: 122, currency: 'RON' },
  { date: '2026-02-21', name: 'Covrigi nutela (eating out)', amount: 10, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'eating-out' } },
  { date: '2026-02-19', name: 'Netflix', amount: 51, currency: 'RON' },

  // Săpt 4 (23 feb - 1 mar) — items până în 28 feb merg în Feb
  { date: '2026-02-25', name: 'HBO', amount: 45, currency: 'RON' },
  { date: '2026-02-23', name: 'Sana', amount: 6, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'groceries' } },
  { date: '2026-02-23', name: 'Curent', amount: 117, currency: 'RON' },
  { date: '2026-02-24', name: 'Freshful', amount: 270, currency: 'RON' },
  { date: '2026-02-24', name: 'Ibric (cadou Ana via emag)', amount: 44, currency: 'RON', hint: { categorySlug: 'gifts' } },
  { date: '2026-02-25', name: 'Oktoberfest (drinks)', amount: 85, currency: 'RON' },
  { date: '2026-02-25', name: 'Mâncare pisici', amount: 32, currency: 'RON' },
  { date: '2026-02-26', name: 'Bolt', amount: 25, currency: 'RON', hint: { subcategorySlug: 'ride-sharing' } },
  { date: '2026-02-26', name: 'Bilet loto', amount: 17, currency: 'RON' },
  { date: '2026-02-26', name: 'Ceară păr', amount: 100, currency: 'RON' },
  { date: '2026-02-27', name: 'Mega image', amount: 85, currency: 'RON' },
  { date: '2026-02-27', name: 'Spălat mașină', amount: 80, currency: 'RON' },
  { date: '2026-02-27', name: 'Freshful', amount: 275, currency: 'RON' },
  { date: '2026-02-28', name: 'Popeyes (food delivery)', amount: 57, currency: 'RON' },
  { date: '2026-02-28', name: 'Metrou', amount: 60, currency: 'RON' },
  { date: '2026-02-28', name: 'Hanul Berarilor (eating out)', amount: 116, currency: 'RON' },
  { date: '2026-02-28', name: 'McDonalds (eating out)', amount: 80, currency: 'RON' },
  { date: '2026-02-28', name: 'Apa plată Ikea', amount: 6.4, currency: 'RON', hint: { categorySlug: 'misc' } },
  { date: '2026-02-28', name: 'Întreținere ianuarie', amount: 396, currency: 'RON' },
  { date: '2026-02-28', name: 'Apple Music', amount: 37, currency: 'RON' },
  { date: '2026-02-28', name: 'YouTube Premium', amount: 38, currency: 'RON' },

  // ============= MARTIE 2026 =============
  // Săpt 1 (2-8 mar)
  { date: '2026-03-02', name: 'Flori și mărțișoare', amount: 21, currency: 'RON', hint: { categorySlug: 'gifts' } },
  { date: '2026-03-02', name: 'Tuns', amount: 130, currency: 'RON' },
  { date: '2026-03-03', name: 'Carrefour', amount: 13, currency: 'RON' },
  { date: '2026-03-03', name: 'Han', amount: 50, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'eating-out' } },
  { date: '2026-03-04', name: 'Bilete loto', amount: 25, currency: 'RON' },
  { date: '2026-03-04', name: 'Impozit anual mașină', amount: 102, currency: 'RON', hint: { categorySlug: 'finance', subcategorySlug: 'taxes' } },
  { date: '2026-03-05', name: 'Parcare martie', amount: 120, currency: 'RON' },
  { date: '2026-03-05', name: 'ChatGPT', amount: 30, currency: 'RON' },
  { date: '2026-03-06', name: 'Metrou', amount: 50, currency: 'RON' },
  { date: '2026-03-06', name: 'McDonalds (food delivery)', amount: 50, currency: 'RON' },
  { date: '2026-03-07', name: 'Vacanță (zbor + cazare)', amount: 1800, currency: 'RON' },
  { date: '2026-03-08', name: 'Zambile', amount: 20, currency: 'RON', hint: { categorySlug: 'gifts' } },
  { date: '2026-03-08', name: 'Cinema', amount: 58, currency: 'RON' },
  { date: '2026-03-08', name: 'Auchan', amount: 57, currency: 'RON' },
  { date: '2026-03-08', name: 'McDonalds (food delivery)', amount: 30, currency: 'RON' },
  { date: '2026-03-08', name: 'iCloud', amount: 50, currency: 'RON' },
  { date: '2026-03-08', name: 'Pizza (food delivery)', amount: 114, currency: 'RON' },

  // Săpt 2 (9-15 mar)
  { date: '2026-03-10', name: 'Chirie', amount: 2850, currency: 'RON' },
  { date: '2026-03-11', name: 'Terapie', amount: 300, currency: 'RON' },
  { date: '2026-03-09', name: 'Covrigi omv', amount: 13, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'eating-out' } },
  { date: '2026-03-09', name: 'Tri Vet', amount: 17, currency: 'RON', hint: { categorySlug: 'pets', subcategorySlug: 'pet-vet' } },
  { date: '2026-03-09', name: 'Freshful', amount: 517, currency: 'RON' },
  { date: '2026-03-09', name: 'Digi', amount: 78, currency: 'RON' },
  { date: '2026-03-10', name: 'ChatGPT Plus', amount: 76, currency: 'RON' },
  { date: '2026-03-10', name: 'Bilete loto', amount: 16, currency: 'RON' },
  { date: '2026-03-11', name: 'Comandă Zooplus', amount: 575, currency: 'RON' },
  { date: '2026-03-11', name: 'Comandă Emag', amount: 370, currency: 'RON' },
  { date: '2026-03-11', name: 'Metrou', amount: 10, currency: 'RON' },
  { date: '2026-03-11', name: 'Abonament lunar metrou', amount: 100, currency: 'RON' },
  { date: '2026-03-12', name: 'Pateuri (eating out)', amount: 16, currency: 'RON' },
  { date: '2026-03-12', name: 'Restomyl gel', amount: 200, currency: 'RON', hint: { categorySlug: 'pets', subcategorySlug: 'pet-vet' } },
  { date: '2026-03-12', name: 'Apă și ciocolată', amount: 11, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'drinks' } },
  { date: '2026-03-12', name: 'Ceară păr', amount: 87, currency: 'RON' },
  { date: '2026-03-13', name: 'Velocita (eating out)', amount: 30, currency: 'RON' },
  { date: '2026-03-13', name: 'Tacos MAT (eating out)', amount: 179, currency: 'RON' },
  { date: '2026-03-13', name: 'Curier tips', amount: 5, currency: 'RON', hint: { categorySlug: 'misc' } },
  { date: '2026-03-14', name: 'Cinema', amount: 63, currency: 'RON' },
  { date: '2026-03-14', name: 'Popeyes (food delivery)', amount: 37, currency: 'RON' },
  { date: '2026-03-14', name: 'Uber', amount: 45, currency: 'RON' },
  { date: '2026-03-15', name: 'Uber', amount: 33, currency: 'RON' },
  { date: '2026-03-15', name: 'Mega image', amount: 30, currency: 'RON' },
  { date: '2026-03-15', name: 'Luca covrigi (eating out)', amount: 19.5, currency: 'RON' },

  // Săpt 3 (16-22 mar)
  { date: '2026-03-16', name: 'Reincărcare cartelă Vodafone roaming', amount: 111, currency: 'RON' },
  { date: '2026-03-16', name: 'Curent', amount: 100, currency: 'RON' },
  { date: '2026-03-16', name: 'Curier', amount: 10, currency: 'RON', hint: { categorySlug: 'misc' } },
  { date: '2026-03-17', name: 'Smash Burger (food delivery)', amount: 138, currency: 'RON' },
  { date: '2026-03-17', name: 'Freshful', amount: 350, currency: 'RON' },
  { date: '2026-03-18', name: 'McDonalds (food delivery)', amount: 52, currency: 'RON' },
  { date: '2026-03-18', name: 'Bilete loto', amount: 17, currency: 'RON' },
  { date: '2026-03-19', name: 'Donație pisici', amount: 50, currency: 'RON', hint: { categorySlug: 'donations' } },
  { date: '2026-03-19', name: 'Cinema', amount: 44, currency: 'RON' },
  { date: '2026-03-20', name: 'Popeyes (food delivery)', amount: 177, currency: 'RON' },
  { date: '2026-03-21', name: 'Tuns', amount: 130, currency: 'RON' },
  { date: '2026-03-21', name: 'Snacks la cinema', amount: 19, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'drinks' } },
  { date: '2026-03-22', name: 'Pizza (food delivery)', amount: 116, currency: 'RON' },

  // Săpt 4 (23-29 mar)
  { date: '2026-03-23', name: 'Zen Sushi (food delivery)', amount: 225, currency: 'RON' },
  { date: '2026-03-23', name: 'Bolt ridesharing', amount: 16, currency: 'RON' },
  { date: '2026-03-23', name: 'Mega image', amount: 25, currency: 'RON' },
  { date: '2026-03-24', name: 'Priority RyanAir', amount: 200, currency: 'RON', hint: { categorySlug: 'vacation', subcategorySlug: 'travel' } },
  { date: '2026-03-26', name: 'Cheltuieli vacanță', amount: 2000, currency: 'RON', hint: { categorySlug: 'vacation', subcategorySlug: 'travel' } },
  { date: '2026-03-25', name: 'Bilet loto', amount: 8.5, currency: 'RON' },
  { date: '2026-03-25', name: 'Uber până la Ana', amount: 20, currency: 'RON' },
  { date: '2026-03-26', name: 'Drum aeroport', amount: 35, currency: 'RON' },
  { date: '2026-03-26', name: 'Cadou Claudia', amount: 200, currency: 'RON', hint: { categorySlug: 'gifts' } },
  { date: '2026-03-26', name: 'M&M', amount: 33, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'drinks' } },
  { date: '2026-03-26', name: '2 x apa plată aeroport', amount: 20, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'drinks' } },
  { date: '2026-03-26', name: 'Loz RyanAir', amount: 10, currency: 'RON', hint: { categorySlug: 'vacation', subcategorySlug: 'travel' } },
  { date: '2026-03-28', name: 'YouTube Premium', amount: 37, currency: 'RON' },
  { date: '2026-03-29', name: 'Apple Music', amount: 37, currency: 'RON' },
  { date: '2026-03-25', name: 'HBO', amount: 45, currency: 'RON' },
  { date: '2026-03-29', name: 'Retur aeroport', amount: 100, currency: 'RON', hint: { subcategorySlug: 'ride-sharing' } },
  { date: '2026-03-29', name: 'Bolt de la Ana', amount: 20, currency: 'RON' },

  // ============= APRILIE 2026 =============
  // Săpt 1 (31 mar - 5 apr) — items 1-5 apr
  { date: '2026-04-01', name: 'Popeyes (food delivery)', amount: 180, currency: 'RON' },
  { date: '2026-04-01', name: 'Întreținere februarie', amount: 358, currency: 'RON' },
  { date: '2026-04-01', name: 'Parcare aprilie', amount: 120, currency: 'RON' },
  { date: '2026-04-01', name: 'Terapie', amount: 300, currency: 'RON' },
  { date: '2026-04-02', name: 'Comandă Emag (rucsac laptop)', amount: 263, currency: 'RON' },
  { date: '2026-04-02', name: 'Bolt', amount: 20, currency: 'RON' },
  { date: '2026-04-03', name: 'Mega image', amount: 51, currency: 'RON' },
  { date: '2026-04-03', name: 'Bilete loto', amount: 17, currency: 'RON' },
  { date: '2026-04-04', name: 'Mega image', amount: 23, currency: 'RON' },
  { date: '2026-04-04', name: 'Freshful', amount: 263, currency: 'RON' },
  { date: '2026-04-05', name: 'Comandă Emag (protecție ploaie rucsac)', amount: 45, currency: 'RON' },
  { date: '2026-04-05', name: 'Pizza (food delivery)', amount: 100, currency: 'RON' },

  // Săpt 2 (6-12 apr)
  { date: '2026-04-06', name: 'Reincărcare cartelă Vodafone', amount: 50, currency: 'RON' },
  { date: '2026-04-06', name: 'Inhalator Foster și Vitamina C', amount: 270, currency: 'RON' },
  { date: '2026-04-07', name: 'Mega image', amount: 70, currency: 'RON' },
  { date: '2026-04-07', name: 'Digi', amount: 161, currency: 'RON' },
  { date: '2026-04-08', name: 'Smash Burger (food delivery)', amount: 147, currency: 'RON' },
  { date: '2026-04-08', name: 'Înghețată Bolt', amount: 93, currency: 'RON', hint: { categorySlug: 'food-drinks', subcategorySlug: 'drinks' } },
  { date: '2026-04-08', name: 'iCloud', amount: 50, currency: 'RON' },
  { date: '2026-04-09', name: 'Donație pisici', amount: 50, currency: 'RON', hint: { categorySlug: 'donations' } },
  { date: '2026-04-09', name: 'Masa Paste', amount: 400, currency: 'RON', hint: { categorySlug: 'food-drinks' } },
  { date: '2026-04-10', name: 'Chirie', amount: 3000, currency: 'RON' },
  { date: '2026-04-10', name: 'Bilet loto', amount: 16, currency: 'RON' },
  { date: '2026-04-11', name: 'Mega image', amount: 35, currency: 'RON' },
  { date: '2026-04-11', name: 'Metrou', amount: 5, currency: 'RON' },
  { date: '2026-04-12', name: 'ChatGPT', amount: 100, currency: 'RON' },

  // Săpt 3 (13-19 apr)
  { date: '2026-04-13', name: 'Bilet loto', amount: 25, currency: 'RON' },
  { date: '2026-04-13', name: 'Metrou', amount: 25, currency: 'RON' },
  { date: '2026-04-14', name: 'Tuns', amount: 130, currency: 'RON' },
  { date: '2026-04-14', name: 'Claritine', amount: 33, currency: 'RON' },
  { date: '2026-04-15', name: 'Freshful', amount: 575, currency: 'RON' },
  { date: '2026-04-15', name: 'Terapie', amount: 300, currency: 'RON' },
  { date: '2026-04-16', name: 'Comandă Wolt', amount: 48, currency: 'RON' },
  { date: '2026-04-16', name: 'Mega image', amount: 60, currency: 'RON' },
  { date: '2026-04-17', name: 'Detartraj', amount: 480, currency: 'RON' },
  { date: '2026-04-17', name: 'Mega image', amount: 110, currency: 'RON' },
  { date: '2026-04-18', name: 'Bere cu Manu (drinks)', amount: 65, currency: 'RON' },
  { date: '2026-04-18', name: 'Comandă Zooplus', amount: 395, currency: 'RON' },
  { date: '2026-04-19', name: 'Comandă Vivo Burger (food delivery)', amount: 100, currency: 'RON' },

  // Săpt 4 (20-26 apr)
  { date: '2026-04-20', name: 'Mega image', amount: 85, currency: 'RON' },
  { date: '2026-04-19', name: 'Netflix', amount: 74, currency: 'RON' },
  { date: '2026-04-20', name: 'McDonalds (food delivery)', amount: 53, currency: 'RON' },
  { date: '2026-04-21', name: 'Bilet loto', amount: 17, currency: 'RON' },
  { date: '2026-04-21', name: 'Pizza (food delivery)', amount: 122, currency: 'RON' },
  { date: '2026-04-22', name: 'Gaze', amount: 289, currency: 'RON' },
  { date: '2026-04-22', name: 'Metrou', amount: 25, currency: 'RON' },
  { date: '2026-04-22', name: 'Velocita (eating out)', amount: 26, currency: 'RON' },
  { date: '2026-04-23', name: 'Deodorant și șampon', amount: 168, currency: 'RON' },
  { date: '2026-04-23', name: 'Mega image', amount: 54, currency: 'RON' },
  { date: '2026-04-24', name: 'Spălat mașină', amount: 45, currency: 'RON' },
  { date: '2026-04-24', name: 'Apa Ikea', amount: 6.4, currency: 'RON', hint: { categorySlug: 'misc' } },
  { date: '2026-04-25', name: 'Ikea', amount: 126, currency: 'RON' },
  { date: '2026-04-25', name: 'Benzină', amount: 105, currency: 'RON' },
  { date: '2026-04-25', name: 'Zen Sushi (food delivery)', amount: 180, currency: 'RON' },
  { date: '2026-04-25', name: 'HBO', amount: 45, currency: 'RON' },
  { date: '2026-04-26', name: 'Hanul Berarilor (eating out)', amount: 20, currency: 'RON' },
  { date: '2026-04-26', name: 'Mega image', amount: 25, currency: 'RON' },
  { date: '2026-04-26', name: 'Velocita (eating out)', amount: 52, currency: 'RON' },

  // Săpt 5 scurtă (27-30 apr)
  { date: '2026-04-27', name: 'Metrou', amount: 15, currency: 'RON' },
  { date: '2026-04-27', name: 'Flori', amount: 10, currency: 'RON', hint: { categorySlug: 'gifts' } },
  { date: '2026-04-27', name: 'Mesopotamia (eating out)', amount: 114, currency: 'RON' },
  { date: '2026-04-28', name: 'YouTube Premium', amount: 38, currency: 'RON' },
  { date: '2026-04-28', name: 'LeBab Burger (food delivery)', amount: 85, currency: 'RON' },
  { date: '2026-04-29', name: 'Apple Music', amount: 37, currency: 'RON' },
  { date: '2026-04-29', name: 'McDonalds (food delivery)', amount: 48, currency: 'RON' },
  { date: '2026-04-29', name: 'Terapie', amount: 300, currency: 'RON' },
  { date: '2026-04-30', name: 'Mega image', amount: 104, currency: 'RON' },
  { date: '2026-04-30', name: 'Genin Shaorma (food delivery)', amount: 63, currency: 'RON' },
];
