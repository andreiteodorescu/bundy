# Bundy

Personal expense & budget tracking PWA. Mobile-first, dark mode, free hosting (Vercel + Supabase), no Google indexing.

Domain: **bundy.ro**

---

## Stack

| Strat | Alegere | Rol |
|---|---|---|
| Build | Vite 6 + React 18 + TS | SPA bundler |
| PWA | `vite-plugin-pwa` (Workbox) | Service worker + manifest, install pe iOS/Android |
| UI | Mantine v7 | Componente, dark mode, AppShell, formulare |
| Charts | `@mantine/charts` (Recharts) | Bar / Donut / Line |
| Iconițe | `@tabler/icons-react` | Set curat de ~60 icons folosit în picker |
| State server | TanStack Query | Cache + invalidare după mutații |
| State client | Zustand | Local UI state (dacă e nevoie) |
| Forms | React Hook Form + Zod | Validare (folosit selectiv) |
| Routing | React Router v6 (Data Router) | Route splitting via `lazy()` |
| Date | dayjs + ro locale + isoWeek | Săptămâni Mon-start, formatare ro-RO |
| Fuzzy | Fuse.js | History match în autocomplete |
| DB + Auth | **Supabase** (Postgres + RLS + Auth) | Free tier 500MB |
| Hosting | **Vercel** Hobby | Free, custom domain, serverless `/api/*` |
| FX rates | BNR proxy via `api/fx.ts` | EUR/USD → RON, cached în DB |

---

## Structură directoare

```
api/
  fx.ts                       Vercel function: parsează BNR XML și upsertează în fx_rates
src/
  app/                        main, App, providers, router (cu lazy routes)
  features/
    auth/                     AuthProvider, LoginPage, ProtectedRoute, bootstrap (RPC)
    expenses/                 List, AddExpense form (cu autocomplete), API hooks
    categories/               List + reorder, Category/Subcategory forms
    subscriptions/            List cu total RON, Form, generator client-pull
    loans/                    Rate (împrumuturi bancare): List, Form, generator (sursă='loan')
    fixed-expenses/           List + reorder, Form, PrePage (quick-add înainte de Add Expense)
    budgets/                  List, Form cu calendar custom, ProgressBar, ActiveBudgetBanner, status helper
    analytics/                Page cu trend lunar/săptămânal, donut, top subcategorii
    settings/                 MorePage (drawer)
  components/                 BottomNav, Layouts, ColorPicker, IconPicker, SwUpdatePrompt
  lib/
    supabase.ts               createClient + custom storage adapter (localStorage + IndexedDB)
    queryClient.ts            TanStack Query config
    fx.ts                     getFxRate (DB cache → /api/fx fallback)
    autocomplete.ts           3-layer match: user rules → seed rules → Fuse history
    money.ts                  Currency type, formatRon, round2
    dates.ts                  splitMonthIntoWeeks (regula aprilie), todayIso, ymd
  data/
    categories.seed.ts        14 categorii default
    subcategories.seed.ts     ~47 subcategorii default
    brandRules.seed.ts        ~80 reguli RO brand → category (Freshful, Mega Image, Uber etc.)
    icons.registry.ts         Subset curat ~60 Tabler icons
  styles/                     theme.ts (Mantine), globals.css (safe-area-inset)
  types/                      TS types (Expense, Budget, Category, Subscription, ...)
supabase/
  migrations/
    0001_init.sql             Schemă completă + RLS + triggers
    0002_bootstrap_policies.sql   INSERT policies pe profiles/profile_members (deprecated, vezi 0003)
    0003_bootstrap_rpc.sql    SECURITY DEFINER bootstrap_profile() — folosit la primul login
    0004_weekly_cadence.sql   Adaugă 'weekly' la cadence
    0005_translate_seeded_names.sql  Traducere RO pentru categoriile is_system existente
    0006_loans.sql            Tabela loans (Rate) + RLS + 'loan' source pe expenses
scripts/
  historical-data.ts          ~180 cheltuieli Feb/Mar/Apr 2026 (input user)
  seed-historical.ts          Inserare backfill (folosește service role key)
public/
  robots.txt                  Disallow: /  (no Google indexing)
  icons/                      PWA icons (192, 512, 512-maskable) — ÎNCĂ DE GENERAT
.env.local                    Secrets (gitignored)
vite.config.ts                PWA, code-splitting manualChunks, dev BNR middleware
vercel.json                   X-Robots-Tag noindex pe toate rutele
```

---

## Setup local (zero la dev rulând)

### 1. Cont Supabase
1. https://supabase.com → New Project (regiunea EU central / Frankfurt e cea mai aproape).
2. Project Settings → API → copiază:
   - **Project URL** (NU "REST API URL")
   - **anon public** key
   - **service_role** key (secret, doar pentru `api/fx.ts` și `scripts/seed-historical.ts`)
3. SQL Editor → New query → rulează ÎN ORDINE:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0003_bootstrap_rpc.sql` (sare peste 0002, e deprecated)
   - `supabase/migrations/0004_weekly_cadence.sql`
   - `supabase/migrations/0005_translate_seeded_names.sql` *(dacă userii deja existenți au categorii în engleză)*
   - `supabase/migrations/0006_loans.sql`
4. Authentication → Providers → Email → **dezactivează "Enable Sign Ups"** (nimeni nu poate crea cont singur).
5. Authentication → Users → Add user → introdu email + parolă pentru tine.

### 2. `.env.local` (lângă `package.json`)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
Fără ghilimele, fără spații. Restartează `npm run dev` după modificări (Vite citește env doar la start).

### 3. Dev
```bash
npm install
npm run dev          # http://localhost:5173
```

Login → bootstrap-ul rulează automat la primul login (creează profil + categorii + subcategorii).

### 4. Backfill istoric (opțional, o singură dată)
```bash
npm run seed:historical
```
Inserează ~180 cheltuieli Feb/Mar/Apr 2026 din `scripts/historical-data.ts`. Idempotent: skip dacă există nume+dată+sumă identice.

---

## Adăugare user nou (prieten)

Doar în Supabase Dashboard:
1. Authentication → Users → **Add user** → email + parolă temporară.
2. Userul se loghează în app cu acele credențiale → `bootstrap_profile()` îi creează automat profilul lui și categoriile (RLS îl ține izolat de datele tale).
3. Dacă vrei să îi resetezi parola: Authentication → Users → click pe user → Reset password.

> Nu adăuga useri în `.env.local` — autentificarea merge prin Supabase Auth, nu prin variabile de mediu.

---

## Cum funcționează (concepte cheie)

### Autocomplete smart la "Adaugă cheltuială"
3 nivele, prima potrivire câștigă:
1. **User rules** (DB, profile-scoped) — viitor: pagină în Settings pentru editare
2. **Seed rules** (`src/data/brandRules.seed.ts`) — RO brand → category (Freshful → Băcănie, Uber → Ride sharing etc.)
3. **History fuzzy** (Fuse.js peste ultimele 500 expenses) — pentru chestii nou notate

Regula se aplică pe `name.toLowerCase().includes(pattern)`. Reguli mai lungi câștigă prin priority (ex: "bolt food" priority 10 > "bolt" priority 0).

Adaugă o regulă nouă pentru un brand: editează `src/data/brandRules.seed.ts` și redeployază.

### BNR FX → RON
- `getFxRate(date, currency)` în `src/lib/fx.ts`
- 1) lookup `fx_rates` table (cache).
- 2) miss → call `/api/fx?date=...&currency=...` (Vercel function).
- 3) `api/fx.ts` parsează BNR XML (`https://bnr.ro/files/xml/years/nbrfxratesYYYY.xml`), găsește cursul cel mai recent ≤ data cerută (fallback weekend/sărbători), upsertează în `fx_rates`.
- În dev, `/api/fx` rulează ca middleware Vite (vezi `vite.config.ts → apiDevMiddleware`).
- Pe expense salvăm `fx_rate` și `fx_rate_date` ca să nu se schimbe rapoartele istorice când BNR re-publică.

### Subscriptions: generator client-pull
La fiecare login (gated cu un flag `bundy.subscriptions.lastRun=YYYY-MM-DD` în localStorage), `runSubscriptionGenerator()`:
- Iterează prin subscripțiile active.
- Pentru fiecare, calculează datele de charge între `today-30d` și `today` (handle săptămânal/lunar/anual + clamping la sfârșit de lună pentru day=31).
- Pentru fiecare dată, verifică dacă există deja expense (`source='subscription' AND source_ref_id=sub.id AND occurred_on=date`).
- Dacă nu, fetch BNR rate (dacă currency != RON) și inserează.

Idempotent prin partial unique index în 0001:
```sql
unique (profile_id, source_ref_id, occurred_on) where source = 'subscription'
```

### Rate (împrumuturi bancare)
Modelat ca tabelă separată de subscriptions (`loans`):
- Câmpuri specifice: `bank`, `total_amount` (principal opțional), `monthly_payment`, `charge_day` (1-31), `start_date`, `end_date` (opțional — generator-ul oprește după), `interest_rate` (% anual opțional).
- Generator în `src/features/loans/generator.ts` rulează la fiecare login (gated cu flag `bundy.loans.lastRun=YYYY-MM-DD`). Inserează expenses cu `source='loan'`, idempotent prin partial unique index `(profile_id, source_ref_id, occurred_on) WHERE source='loan'`.
- Numele cheltuielii generate include banca: "Credit nevoi personale (BCR)".
- Dropdown bancă: `src/data/banks.ts` listează ~20 bănci RO; field-ul e `Autocomplete` deci permite și text liber.
- Categorie default la rată nouă: Finanțe > Credite (auto-precompletat).
- Tag implicit: `loan` pe fiecare expense generată — util pentru filtre Analytics ulterioare.

### Fixed expenses: pre-page la (+) FAB
- (+) FAB navighează la `/expenses/quick-add`.
- `FixedExpensesPrePage` afișează lista. Tap pe item = expense creat instant pentru azi.
- Dacă lista e goală, redirect automat la `/expenses/add`.

### Budget status (Activ / Aproape / Atins / Depășit / Următor)
Calculat în `src/features/budgets/status.ts` din: data curentă vs `period_start/end` (sau `selected_days`) + spent vs `amount_ron`:
- **Următor** (gri): perioada nu a început.
- **Depășit** (roșu): spent > amount, în orice moment.
- **Atins** (verde): perioada s-a terminat și spent ≤ amount.
- **Aproape** (portocaliu): perioadă activă și spent ≥ 90%.
- **Activ** (accent): perioadă activă, sub 90%.

### Editare buget activ
Comportament curent (intenționat):
- Dacă schimbi `selected_days` (extinzi perioada), `useBudgetProgress` recalculează automat suma pe noile zile.
- Dacă schimbi `amount_ron`, progresul recalculează imediat.
- Threshold-urile deja firate stau în `budget_notifications` și **nu re-firează** chiar dacă lowering threshold-ul te-ar duce în zona deja crossed. Asta evită spam-ul de notificări.
- Dacă vrei să "reset"-ezi notificările pentru un buget: din Supabase SQL editor `DELETE FROM budget_notifications WHERE budget_id = '...'`.

### Never-logout pe iOS PWA
- `src/lib/supabase.ts` definește un custom storage adapter care scrie sesiunea în **AMBELE** localStorage + IndexedDB (`idb-keyval`). iOS evictează localStorage din PWA-uri după ~7 zile inactivitate; IndexedDB rezistă mai bine.
- `visibilitychange` listener → `supabase.auth.refreshSession()` la foreground.
- Supabase config: `autoRefreshToken: true`, `persistSession: true`, `flowType: 'pkce'`.

### Săptămâni grupate (regula aprilie)
`splitMonthIntoWeeks(monthDate)` în `src/lib/dates.ts` returnează:
- Săpt 1 = ziua 1 până la prima duminică (parțială dacă luna nu începe luni).
- Săpt 2..N = Mon-Sun complete.
- Ultima săptămână = Mon → ultima zi a lunii (parțială).

Folosit în `ExpensesListPage` pentru gruparea cheltuielilor și în `AnalyticsPage` pentru bar chart-ul săptămânal.

---

## Comenzi utile

```bash
npm run dev                  # Vite dev server
npm run build                # Production build
npm run preview              # Servește dist/ local
npm run typecheck            # tsc -b --noEmit
npm run lint                 # ESLint
npm run format               # Prettier
npm run seed:historical      # Backfill Feb/Mar/Apr 2026 (folosește service_role key)
```

---

## Deploy pe Vercel + bundy.ro

1. Push repoul pe GitHub (privat).
2. https://vercel.com → New Project → import repo. Framework auto-detectat (Vite).
3. Project Settings → Environment Variables → adaugă cele 3 din `.env.local`. **NU** adăuga `SUPABASE_SERVICE_ROLE_KEY` cu prefix VITE_ — păstrează-l fără prefix (e folosit doar în `api/fx.ts`).
4. Deploy. URL-ul preview va fi `bundy.vercel.app` sau similar.
5. Project → Domains → adaugă `bundy.ro` și `www.bundy.ro`. Vercel îți afișează 2 nameservers (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
6. La ROTLD (rotld.ro) → panel domeniu `bundy.ro` → schimbă nameservers la cele de la Vercel.
7. Așteaptă propagare DNS (1-24h). SSL via Let's Encrypt automat.

### iOS PWA install
1. Deschide `https://bundy.ro` în Safari pe iPhone.
2. Share → "Add to Home Screen" → numele "Bundy".
3. Lansează din home screen → arată ca app standalone (fără bară Safari).

### Verificări post-deploy
- `curl -I https://bundy.ro/` → header `X-Robots-Tag: noindex, nofollow`.
- `https://bundy.ro/robots.txt` → `Disallow: /`.
- DevTools (Safari) pe iPhone → Application → IndexedDB → `keyval-store` → după login există cheia `bundy.auth.session`.

---

## Adăugarea de funcționalități în viitor

### Cum sunt organizate features
Fiecare feature stă în `src/features/<feature>/` cu:
- `api.ts` — TanStack Query hooks (use<X>, useUpsert<X>, useDelete<X>) folosind `supabase` client
- `*Page.tsx` — pagini routate
- Componente specifice features

Hooks-urile invalidează `queryKey` la mutații pentru sync UI.

### Schimbarea/adăugarea de categorii sau brand rules
- Categorii noi: editează `src/data/categories.seed.ts` — apar la useri NOI (la bootstrap). Pentru tine, adaugă-le manual din UI sau printr-un INSERT SQL.
- Brand rules noi: editează `src/data/brandRules.seed.ts`. Pattern lowercase + `category_slug` (+ optional `subcategory_slug`, `priority`). Re-deploy = active imediat.

### Adăugarea unei migrări DB
1. Creează `supabase/migrations/000N_my_change.sql` cu numerotare incrementală.
2. Rulează în Supabase SQL Editor.
3. Documentează aici în README dacă e relevant.

### Modificări de schemă pe tabele cu RLS
RLS e activă pe toate tabelele profile-scoped. Când adaugi o coloană nouă: nu te afectează policies-urile existente (sunt pe whole-row, nu pe coloane). Când adaugi un tabel nou: ENABLE RLS + adaugă policy `members all` ca în 0001 (vezi loop-ul cu `tables array`).

### Adăugarea unui chart nou în Analytics
- `src/features/analytics/api.ts` are `useExpensesInRange` care fetch-uiește toate cheltuielile dintr-un interval.
- În `AnalyticsPage.tsx` adaugă un nou `useMemo` pentru aggregarea ta + un `<BarChart>` / `<DonutChart>` / `<LineChart>` din `@mantine/charts`.
- Pentru axe Y cu sume mari, folosește `compactRon` (ex: 1.2k, 12k) prin `yAxisProps={{ tickFormatter: compactRon }}`.

### Debug "expense neclasificat corect"
1. Verifică dacă brand rule există pentru numele introdus: `Settings → Categorii → ...` (TODO: în viitor — pagină Brand rules editor în Settings).
2. Adaugă o intrare nouă în `src/data/brandRules.seed.ts` și redeployează.
3. Cheltuielile vechi nu se re-categorizează automat — le poți edita manual.

### Reset complet pentru un user
```sql
DELETE FROM expenses WHERE profile_id = '<uuid>';
DELETE FROM subscriptions WHERE profile_id = '<uuid>';
DELETE FROM budgets WHERE profile_id = '<uuid>';
DELETE FROM fixed_expenses WHERE profile_id = '<uuid>';
-- categoriile + subcategoriile pot rămâne
```

### Reset categorii la default după modificări
```sql
DELETE FROM subcategories WHERE profile_id = '<uuid>' AND is_system = true;
DELETE FROM categories WHERE profile_id = '<uuid>' AND is_system = true;
-- apoi logout + login → bootstrap re-seedează din src/data/*.seed.ts
```

---

## Troubleshooting

### "ERR_NAME_NOT_RESOLVED" la login
URL Supabase greșit în `.env.local`. Verifică că nu are `/rest/v1/` la final — doar `https://xxxxx.supabase.co`. Restartează `npm run dev`.

### "new row violates row-level security policy for table 'profiles'"
Migrația `0003_bootstrap_rpc.sql` nu a fost aplicată. Rulează-o în SQL Editor.

### "Invalid path specified in request URL" la login
Același ca mai sus — URL Supabase are path în plus.

### Categoriile apar în engleză
Migrația `0005_translate_seeded_names.sql` nu a fost aplicată sau categoriile au fost create manual (nu prin bootstrap, deci `is_system=false` și nu se traduc).

### Subscription generator nu rulează
Verifică DevTools → Console pentru `[bundy] subscription generator failed`. Cele mai frecvente: 
- `getFxRate` eșuează în dev pentru că BNR XML e mare → așteaptă 1-2 secunde după login.
- Flag-ul `bundy.subscriptions.lastRun` în localStorage previne re-rularea în aceeași zi. Șterge-l manual ca să forțezi rerularea.

### PWA-ul mă deloghează după câteva zile pe iPhone
- Verifică în DevTools (Mac) → Safari → Develop → iPhone → Storage → IndexedDB → `keyval-store` că există `bundy.auth.session`.
- Dacă nu, custom storage adapter-ul nu mai persistă. Vezi `src/lib/supabase.ts`.

### "Module 'virtual:pwa-register/react' not found" la build
TypeScript types — verifică că `tsconfig.app.json` include `"vite-plugin-pwa/react"` în `types` array.

### BNR Rate fetch failed
Trei cauze posibile:
1. Dev: middleware nu pornește. Restartează `npm run dev`.
2. Prod: `SUPABASE_SERVICE_ROLE_KEY` lipsește din env vars Vercel.
3. BNR site down (rar). Folosește VPN sau verifică `https://bnr.ro/nbrfxrates.xml`.

---

## Decizii de design (de ce așa)

- **Categorie primară + tags**, NU multi-category sau split allocations: analytics curate, fără double-counting. Claude Max → primary `work-business` + tag `subscription` + tag `work-reimbursable`.
- **Client-pull subscriptions**, NU Vercel Cron: zero infra, deschidem app-ul zilnic oricum, idempotent prin unique index.
- **No SSR (SPA Vite)**: nu vrem indexare Google, sesiunea e per-user, SSR ar fi overhead inutil.
- **Mantine v7** peste shadcn: `DatePicker type="multiple"` rezolvă calendarul de buget direct, AppShell + DatesProvider + Charts coerent estetic.
- **Supabase peste Firebase**: Postgres + RLS + auth integrat = data model relațional curat, free tier suficient pentru 2-3 useri.
- **Pre-page Add Expense**: 1-tap adăugare pentru cheltuieli recurrente non-automate (terapie, chirie când nu e exact aceeași sumă) e flow-ul cel mai folosit în practică.
- **Săptămâni încadrate strict în lună (regula aprilie)**: simplifică totalurile lunare, nu mai trebuie reguli speciale pentru săpt extinse cross-lună.
# bundy
