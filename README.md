# Bundy

Personal expense & budget tracking PWA. Mobile-first, dark mode, bilingv RO/EN, free hosting (Vercel + Supabase), no Google indexing.

Domain: **bundy.ro**

---

## Stack

| Strat | Alegere | Rol |
|---|---|---|
| Build | Vite 6 + React 18 + TS | SPA bundler |
| PWA | `vite-plugin-pwa` (Workbox) | Service worker + manifest, install pe iOS/Android |
| UI | Mantine v7 | Componente, dark mode, AppShell, formulare |
| Charts | `@mantine/charts` (Recharts) | Bar / Donut / Line |
| Iconițe Tabler | `@tabler/icons-react` | Set curat de ~70 icons folosit în picker |
| Iconițe brand | `simple-icons` + SVG/PNG/JPEG static | 13 brand-uri din simple-icons (CC0) + 13 fișiere oficiale ale userului |
| State server | TanStack Query | Cache + invalidare după mutații |
| State client | Zustand | Local UI state (dacă e nevoie) |
| Forms | `useState` + validare manuală inline | Pragmatic la scala curentă; RHF + Zod considerat dar n-am simțit nevoia |
| Routing | React Router v6 (Data Router) | Route splitting via `lazy()` |
| Date | dayjs + ro locale + isoWeek | Săptămâni Mon-start, formatare ro-RO |
| Fuzzy | Fuse.js | History match în autocomplete |
| DnD | `@dnd-kit/sortable` | Reorder pe categorii + template-uri (quick/predefined/fixed) |
| DB + Auth | **Supabase** (Postgres + RLS + Auth) | Free tier 500MB |
| Hosting | **Vercel** Hobby | Free, custom domain, serverless `/api/*` + cron |
| Email | **Resend** SMTP (opțional) | Custom SMTP via Supabase Auth pentru subject + body branded + `noreply@bundy.ro` sender |
| FX rates | BNR proxy via `api/fx.ts` | 9 monede non-RON → RON: EUR, USD, GBP, CHF, CAD, AUD, HUF, PLN. Cached în `fx_rates` |
| Cron server-side | Vercel Cron (daily) | Generator subs/loans pentru când userul nu deschide app-ul |
| Captcha | hCaptcha | Anti-bot pe signup/login/forgot |
| i18n | `react-i18next` | RO-first cu fallback EN, switch în Settings, locale persistat în profil |
| Export | `jsPDF` + `jspdf-autotable` (lazy) | PDF/CSV export pe ExpensesListPage, code-split (~420KB lazy chunk) |
| DB backup | GitHub Actions + Supabase CLI | Cron daily la 02:00 UTC, schema + data dump gzipped pushed într-un repo privat separat (`bundy-backups`) |
| Tests | Vitest + @testing-library/react | ~96 cazuri în 10 fișiere — splitMonthIntoWeeks, monthlyEquivalent, chargeDatesInWindow, suggestCategory, computeBudgetStatus, getFxRate, PIN, bankMatcher, displayCurrency |

---

## Structură directoare

```
api/
  fx.ts                       Vercel function: parsează BNR XML și upsertează în fx_rates
  cron/
    generate-recurring.ts     Cron daily: materializează subs/loans pentru toți userii (SUPABASE_SERVICE_ROLE_KEY)
src/
  app/                        main, App, providers, router (cu lazy routes)
  features/
    auth/                     SignupPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, AuthProvider, bootstrap RPC
    home/                     HomePage cu acțiuni stagger-animate + total widget (personal + cont firmă) + ActiveBudgetBanner
    expenses/                 List (grupate pe săptămâni, sortate cronologic în zi), AddExpense form, exportExpenses (PDF/CSV lazy), API hooks
    categories/               List + reorder, Category/Subcategory forms
    subscriptions/            "Cheltuieli recurente": List cu total RON, Form cu 7 cadențe (daily/weekly/biweekly/monthly/quarterly/semiannual/yearly), generator client-pull
    feedback/                 Pagina Suport — bug reports + feature requests + voting + in-app notifications la status change
    loans/                    Rate (împrumuturi bancare): List, Form, generator (sursă='loan')
    savings/                  Economii: List cu filtre + paginare + widget total în EUR, Form cu FX preview, autocomplete cont
    investments/              Investiții: List cu breakdown per instrument_type, Form cu FX preview, autocomplete broker
    fixed-expenses/           List + reorder + edit pencil, Form, PrePage (quick-add înainte de Add Expense)
    quick-expenses/           Templates preț FIX cu stepper -/+ pe zi (Metrou, Loto), reorder
    predefined-expenses/      Templates preț VARIABIL cu tap-to-prefill (Freshful, Bolt), reorder + edit pencil
    budgets/                  List, Form cu calendar custom, ProgressBar, ActiveBudgetBanner, ArchivePage cu filtre + paginare
    analytics/                Page cu trend lunar/săptămânal, donut, top subcategorii, FILTRU pe categorie/subcategorie
    settings/                 SettingsPage (avatar, parolă, PIN TTL, limbă RO/EN, toggle "Card de firmă", șterge cont) + MorePage drawer
    search/                   Spotlight-style search peste cheltuieli (pg_trgm GIN)
    hidden-expenses/          PIN-gate page pentru cheltuieli ascunse
    admin/                    Admin dashboard (vezi useri, ban, șterge, reset parolă)
  components/
    BottomNav                 5-slot mobile nav (Acasă · Cheltuieli · (+) FAB · Analytics · Mai mult) — floating pill capsule cu magnetic ball indicator gradient bronze
    GradientDefs              SVG <linearGradient> defs (id="bundy-bronze-vertical") montat în App pentru fill-ul Recharts bars
    BrandTile                 Tile-rendered logo pentru subscripție/cheltuială recurrentă
    BrandGlyph                Componenta de randare unificată (path inline din simple-icons sau <img> static)
    BrandPicker               Grid picker pentru selectare manuală logo brand (cu search + Auto)
    AnimalIconPicker          Picker de animal-avatar pentru profil
    LanguageSwitcher          Toggle RO/EN în Settings (persistă în profile.locale + i18n.changeLanguage)
    CaptchaGate               Wrapper hCaptcha (no-op în dev fără env var)
    ColorPicker, IconPicker, SwUpdatePrompt, AppShellLayout
  i18n/
    index.ts                  react-i18next setup cu RO-first fallback EN
    locales/ro.json en.json   Toate string-urile aplicației (~400 keys), cu plural forms
    displayName.ts            categoryDisplayName/subcategoryDisplayName (traduce is_system, păstrează custom)
  lib/
    supabase.ts               createClient + custom storage adapter (localStorage + IndexedDB)
    queryClient.ts            TanStack Query config
    fx.ts                     getFxRate (DB cache → /api/fx fallback)
    useFxRates.ts             Hook pentru fetch în masă FX rates pentru o listă de monede (pentru list pages)
    displayCurrency.ts        useDisplayConversion + useTodayDisplayRate hooks — per-expense historical conversion la moneda de display a userului (Option C-B)
    bankMatcher.ts            normalizeMerchant + matchBankRule pentru open banking keyword rules
    useGoBack.ts              History-aware back navigation: navigate(-1) cu fallback la route părinte
    pwa.ts                    isStandalonePWA() — detectare display-mode + iOS navigator.standalone
    autocomplete.ts           3-layer match: user rules → seed rules → Fuse history
    money.ts                  Currency type (9 monede), CURRENCIES array, formatMoney, formatRon, round2
    dates.ts                  splitMonthIntoWeeks (regula aprilie), todayIso, ymd
    text.ts                   diacriticsFilter, cleanExpenseName, normalize
    pin.ts                    PIN hash + TTL helpers
    confirm.ts                confirmDelete modal helper
  data/
    categories.seed.ts        14 categorii default
    subcategories.seed.ts     ~52 subcategorii default (incl. vacation × 6, transport public × 3, work taxes/accountant)
    brandRules.seed.ts        ~95 reguli RO brand → category (incl. cazare, avion, contabil, impozit, dividende, anaf)
    brandLogos.ts             24 brand-uri (13 simple-icons + 13 static) cu auto-detect prin regex
    icons.registry.ts         Subset curat ~70 Tabler icons
    banks.ts                  ~20 bănci RO pentru autocomplete în Loan form
  styles/                     theme.ts (Mantine + bronze accent palette base #cc9429), globals.css (body Aurora teal bg via body::before fixed, glass cards backdrop-filter, bronze gradient pe Buttons/ActionIcons/Switch/SegmentedControl, safe-area-inset)
  types/                      TS types (Expense, Budget, Category, Subscription, Loan, ...)
public/
  brands/                     Static brand assets pentru cele care nu există în simple-icons (linkedin, openai, disney-plus,
                              skyshowtime, antena-play, prime-video, voyo, stepsapp, emag, freshful, zooplus, bolt, microsoft, adobe)
  robots.txt                  Disallow: /  (no Google indexing)
  favicon.ico, favicon-96x96.png, apple-touch-icon.png
  icons/icon-192.png, icon-512.png, icon-512-maskable.png
supabase/
  migrations/
    0001_init.sql             Schemă completă + RLS + triggers + unique idx subscription
    0002_bootstrap_policies.sql   INSERT policies pe profiles/profile_members (deprecated, vezi 0003)
    0003_bootstrap_rpc.sql    SECURITY DEFINER bootstrap_profile() — folosit la primul login
    0004_weekly_cadence.sql   Adaugă 'weekly' la cadence
    0005_translate_seeded_names.sql  Traducere RO pentru categoriile is_system existente
    0006_loans.sql            Tabela loans (Rate) + RLS + 'loan' source pe expenses + unique idx loan
    0007_add_adoption_category.sql  Categoria 'Adopție' la profile existente
    0008_quick_predefined.sql Tabele quick_expenses + predefined_expenses + 'quick' source + col `quantity`
    0009_recategorize_diacritics.sql  Re-categorizare expenses cu diacritice (Spălat mașină etc.)
    0010_add_debt_category.sql Categoria 'Datorie' la profile existente
    0011_hidden_pin_settings.sql  expenses.hidden + profiles.hidden_pin_hash + profiles.settings jsonb
    0012_profile_icon.sql     profiles.icon + bootstrap_profile() acceptă profile_icon
    0013_delete_account.sql   delete_my_account() RPC pentru self-delete cu cascade
    0014_budget_categories.sql    budgets.category_ids text[] (scope pe categorii întregi)
    0015_budget_subcategories.sql budgets.subcategory_ids text[] (scope pe subcategorii specifice)
    0016_search_indexes.sql   pg_trgm GIN indexes pentru ILIKE search rapid
    0017_admin.sql            Role 'admin' + politici de management useri
    0018_lottery_category.sql Categoria 'Loterie' la profile existente
    0019_online_groceries.sql Subcategoria 'Băcănie online' (Freshful) sub Mâncare & Băuturi
    0020_subscription_brand_logo.sql  subscriptions.brand_logo (override manual peste auto-detect)
    0021_vacation_subcategories.sql   6 subcategorii sub Vacanță (Bilete avion, Cazare hotel/Airbnb, etc.)
    0022_dedupe_vacation_subcategories.sql  Cleanup duplicări create de typo de diacritice
    0023_transport_public_split.sql   Transport public → metrou/autobuz/tren + reasignare expenses
    0024_accountant_to_work_business.sql  Mută Contabil din Finanțe în Work & Business + adaugă work-taxes
    0025_company_card_tag.sql Redenumește work-reimbursable → company-card + adaugă tags col pe template tables
    0026_savings_investments.sql Tabele noi savings_transactions + investment_transactions cu RLS, migrare expense-urilor existente pe Finance > Savings/Investments în noile tabele, drop subcategoriile
    0027_budgets_sort_order.sql  budgets.sort_order + reorder hook (DnD pe BudgetsListPage)
    0028_company_card_setting.sql profiles.company_card_enabled bool (grandfather: TRUE pentru profile cu date taggate company-card)
    0029_feedback.sql            feedback + feedback_votes + feedback_notifications + triggers (votes_count auto, status-change notification) + RLS via is_admin()
    0030_extended_cadences.sql   subscriptions cadence CHECK extins: daily/weekly/biweekly/monthly/quarterly/semiannual/yearly
    0031_bank_connections.sql    Tabele open banking: bank_connections + bank_transactions + bank_import_rules + RLS
    0032_default_bank_rules.sql  Seed 7 reguli default (wolt, freshful, mega image, etc.) pe profile existente, idempotent
    0033_bank_pending_requisitions.sql Tabelă short-lived pentru OAuth callbacks GoCardless
    0034_fix_feedback_rls.sql    Fix bug RLS din 0029: policy-urile foloseau profile_id = auth.uid() (greșit, comparase user_id cu profile_id). Switch la pattern-ul standard via profile_members
    0035_fix_feedback_trigger.sql Fix trigger feedback_notify_status_change: SECURITY DEFINER ca să poată insera notification pentru autor când admin schimbă status-ul
.github/
  workflows/
    db-backup.yml               Cron daily 02:00 UTC: schema + data dump via supabase CLI prin Session pooler, gzip, commit în repo (30-day retention)
scripts/
  historical-data.ts          ~180 cheltuieli Feb/Mar/Apr 2026 (input user)
  seed-historical.ts          Inserare backfill (folosește service role key)
.env.local                    Secrets (gitignored)
vite.config.ts                PWA, code-splitting manualChunks, dev BNR middleware
vercel.json                   X-Robots-Tag noindex + cron config /api/cron/generate-recurring daily
```

---

## Setup local (zero la dev rulând)

### 1. Cont Supabase
1. https://supabase.com → New Project (regiunea EU central / Frankfurt e cea mai aproape).
2. Project Settings → API → copiază:
   - **Project URL** (NU "REST API URL")
   - **anon public** key
   - **service_role** key (secret, doar pentru `api/fx.ts`, `api/cron/generate-recurring.ts` și `scripts/seed-historical.ts`)
3. SQL Editor → New query → rulează **ÎN ORDINE** toate `0001_*.sql` … `0035_*.sql` din `supabase/migrations/`. Fiecare e idempotent (poate fi re-rulat fără efect dacă a fost deja aplicat). 0002 e deprecated (înlocuit de 0003) — sare peste.
4. Authentication → Providers → Email → **Enable Sign Ups: ON** (oricine cu URL-ul `bundy.ro` poate crea cont; verificarea email e obligatorie din default).
5. Authentication → URL Configuration:
   - **Site URL**: `https://bundy.ro` (prod) sau `http://localhost:5173` (dev)
   - **Redirect URLs**: `https://bundy.ro/**`, `https://www.bundy.ro/**`, `http://localhost:5173/**`
6. Authentication → **Attack Protection** → Captcha: hCaptcha + paste secret key (opțional, vezi mai jos).

### 2. `.env.local` (lângă `package.json`)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_HCAPTCHA_SITE_KEY=...   # opțional, lasă gol în dev pentru a sări captcha-ul
CRON_SECRET=...              # doar pentru prod (Vercel); irelevant în dev
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

Userul se duce singur la `https://bundy.ro/signup` și își face cont:
1. Email + parolă (min 6 chars) + nume + alege un animal-avatar (pisică, câine, etc.)
2. Trece captcha (hCaptcha)
3. Primește email de verificare → click pe link → cont activat
4. Login → `bootstrap_profile()` RPC îi creează profil + categorii + subcategorii RO seedate
5. RLS îl izolează: nu vede datele tale, tu nu vezi datele lui

**Reset parolă uitată**: pe pagina de login → "Am uitat parola" → primește link prin email.

**Reset parolă din contul tău**: Settings → "Schimbă parola".

**Self-delete**: Settings → "Zonă periculoasă" → "Șterge contul" → cascade delete pentru tot (cheltuieli, bugete etc.) + ștergerea userului din `auth.users`.

---

## hCaptcha (anti-bot signup/login/forgot)

**De ce**: dacă bundy.ro e public, fără captcha cineva poate face zeci de mii de signup-uri spam și ar consuma rate-limits / DB rows. hCaptcha free tier e generos (1M req/lună).

**Setup** (~10 min):
1. Cont gratis la https://hcaptcha.com → Add site → introdu `bundy.ro` (localhost nu e acceptat de hCaptcha — folosește test keys mai jos pentru dev)
2. Site key: vizibil pe pagina sitului
3. Secret key: vizibil pe pagina account-level Settings (NU per-site)
4. `.env.local` + Vercel env vars: `VITE_HCAPTCHA_SITE_KEY=site-key`
5. Supabase Dashboard → Authentication → **Attack Protection** → Captcha Provider: hCaptcha → Secret key: paste

**Test keys (DEV)** care trec mereu captcha-ul automat:
```
Site key:    10000000-ffff-ffff-ffff-000000000001
Secret key:  0x0000000000000000000000000000000000000000
```
Pune site key în `.env.local`, secret key în Supabase → captcha-ul rulează în dev fără puzzle real.

**Skip captcha în dev**: lasă `VITE_HCAPTCHA_SITE_KEY` gol → CaptchaGate randează un mesaj "captcha disabled" și submit merge fără. Dar dacă captcha e ON în Supabase, login va eșua cu "no captcha_token found" — dezactivează în Supabase Auth → Attack Protection sau folosește test keys.

---

## Custom SMTP via Resend (recomandat pentru prod)

**Problema cu SMTP-ul default Supabase**: free tier are **rate limit strict (~3-4 emailuri/oră per project)**. Hit-uiești limita rapid la signup-uri / password reset-uri. Plus emailurile vin de la `noreply@mail.app.supabase.io` (sender name = numele proiectului Supabase) — nu poți customiza.

**Soluția**: Custom SMTP via **Resend** (free 3000 emails/lună, burst-uri de zeci/secundă) — păstrezi Supabase Auth pentru DB + RLS + sessions, schimbi doar **canalul prin care pleacă emailurile**.

### Setup (~10 min)

1. **Cont Resend** la https://resend.com (signup cu GitHub/Google OAuth, rapid).

2. **Adaugă domeniul `bundy.ro`** în Resend → Domains → Add Domain → primești 3-4 DNS records (DKIM, SPF, DMARC opțional).

3. **Adaugă DNS records în Vercel** (pentru că nameservers sunt Vercel, nu ROTLD):
   - Vercel Dashboard → Project → Settings → Domains → bundy.ro → DNS → Add Record
   - Pentru fiecare: copy Name/Type/Value exact din Resend, TTL=60
   - Atenție la DKIM: value-ul e ~300+ caractere, copy-paste exact (folosește butonul Copy din Resend)
   - **NU** include `bundy.ro` în câmpul Name în Vercel — doar partea de subdomeniu (`send`, `resend._domainkey`, `_dmarc`)
   - Verificarea DNS durează 5-30 min după Save

4. **Generează API Key** în Resend → API Keys → Create:
   - Permission: **Sending access** (NU Full access)
   - Domain: `bundy.ro`
   - Copy key-ul `re_xxxxxxxx...` o singură dată (nu îl mai poți vedea)

5. **Activează Custom SMTP în Supabase**:
   - Dashboard → Authentication → SMTP Settings → toggle **Enable Custom SMTP**
   - Host: `smtp.resend.com`, Port: `465`
   - Username: `resend`, Password: API key-ul din pas 4
   - Sender email: `noreply@bundy.ro`, Sender name: `Bundy`

6. **Customizează template-urile email** în Supabase → Authentication → Emails → Templates. Avem versiuni HTML branded (bronze accent button + Bundy logo) pentru: Confirm signup, Reset Password, Change Email Address, Magic Link, Invite User. Subject + body customizate per template.

**Notă importantă**: signup folosește **cod OTP de 8 cifre** ca path principal (vezi secțiunea "OTP-based signup"). Email template-ul pune **codul ca buton mare** + link ca fallback. Userii pe iOS PWA vor folosi codul; non-PWA vor folosi link-ul.

---

## Open Banking (abandonat — codul rămâne în repo)

Am vrut import automat de tranzacții bancare în Bundy. Am încercat două integrări end-to-end și ambele s-au lovit de blocaje regulatorii.

**1. GoCardless Bank Account Data** (fost Nordigen) — implementat tot flow-ul: requisitions, consent PSD2, daily cron sync. La signup pentru cont developer, m-au refuzat: nu mai acceptă useri noi pentru API-ul standalone de Account Data.

**2. Salt Edge** (alternativa cea mai mare din UE) — rescris integrarea de la zero: customers, connect sessions, webhooks, parse-uire tranzacții. Sandbox-ul a funcționat. Pentru production access cer entitate juridică (SRL/SA), reviewuri legale și licențiere PSD2/AISP. Pentru un personal app, disproporționat.

**Concluzia**: API-urile bancare în UE sunt construite în jurul operatorilor reglementați (TPP licențiați). Persoanele fizice care vor să acceseze automat propriile date bancare nu au cale legală directă fără intermediari care la rândul lor cer status corporativ. Decis să renunț la feature.

**Status în repo**:
- Cod backend (`api/bank/*`) și frontend (`src/features/bank/*`) rămân pentru viitor
- UI scos din bundle: route-urile `/bank` și `/bank/callback` sunt comentate în `src/app/router.tsx`, link-ul "Conexiuni bancare" scos din `MorePage`
- DB schema (migrațiile 0031–0036) rămâne — nu strică nimic, doar ocupă tabele goale
- Cronul `/api/cron/sync-bank` rămâne configurat, dar nu are conexiuni active de procesat → no-op zilnic

**Reguli de import** (`bank_import_rules`): seed-ul cu 7 reguli RO (wolt, freshful, mega image, digi/orange/vodafone, zooplus, emag, uber) e inserat tot la signup pentru useri noi (în caz că revin pe feature). Vezi `src/data/bankRules.seed.ts` + `src/lib/bankMatcher.ts`.

**Lecția**: verifică termenii legali ÎNAINTE de a arhitectura un feature care depinde de regulamente. Cele ~3-4 zile de cod ar fi fost ușor evitabile cu o oră de research la început.

---

## Cheltuieli ascunse + PIN (privacy)

**Caz de uz**: vrei să marchezi unele cheltuieli ca private, să nu apară în liste. Suma e inclusă în total (deci totalul matches `total = visible + ascunse`), dar item-ul nu se vede.

**Cum:**
- Adaugă/Edit cheltuială → toggle "Ascunde din liste" → cheltuiala dispare din ExpensesListPage, Analytics charts, autocomplete history, etc.
- "Mai mult" → "Cheltuieli ascunse" → introdu PIN-ul de 4 cifre → vezi lista, edit normal, scoate din ascundere

**Setare PIN**: Settings → "Cheltuieli ascunse" → "Setează PIN" (4 cifre) → confirmă (re-introdu).

**Sliding TTL (window)**: după ce introduci PIN-ul, e valid 5 min default (configurabil în Settings: 1/5/15/60 min). Fereastra se reînnoiește la fiecare interacțiune cu pagina ascunsă. La revenire din background după >TTL, cere PIN-ul din nou.

**Wipeout total** (PIN cerut imediat): închizi tab-ul Safari / închizi PWA pe iOS din memorie / hard refresh.

**SECURITY CAVEAT**: 4 cifre = 10K combinații, brute-force în <1 sec. PIN-ul protejează din **priviri rapide**, nu de un atacator determinat cu acces la DB. Nu pune date sensibile (parole, conturi bancare) la "ascunse".

---

## Cum funcționează (concepte cheie)

### Autocomplete smart la "Adaugă cheltuială"
3 nivele, prima potrivire câștigă:
1. **User rules** (DB, profile-scoped) — viitor: pagină în Settings pentru editare
2. **Seed rules** (`src/data/brandRules.seed.ts`) — RO brand → category (Freshful → Băcănie online, Uber → Ride sharing, contabil → Work & Business, etc.)
3. **History fuzzy** (Fuse.js peste ultimele 500 expenses) — pentru chestii nou notate

Regula se aplică pe `name.toLowerCase().includes(pattern)`. Reguli mai lungi câștigă prin priority (ex: "bolt food" priority 10 > "bolt" priority 0, "cazare hotel" priority 6 > "cazare" priority 0).

Adaugă o regulă nouă pentru un brand: editează `src/data/brandRules.seed.ts` și redeployează (regulile sunt client-side, active la următorul refresh).

### Brand logos (subscripții)
Două surse, unificate prin tipul `BrandLogo` (vezi `src/data/brandLogos.ts`):
1. **simple-icons** (CC0) — 13 brand-uri tree-shaken din pachetul npm: Netflix, Claude, YouTube, Apple Music, iCloud, HBO, Plex, Instagram, Uber, Glovo, Revolut, Apple, Zoom. Randate inline ca `<svg><path/></svg>`.
2. **Static fișiere** în `/public/brands/` — pentru brand-uri care nu există în simple-icons (deprecated la cererea trademark holder-ilor sau niciodată adăugate): LinkedIn, OpenAI/ChatGPT, Disney+, SkyShowtime, AntenaPlay, Prime Video, Voyo, StepsApp, eMAG, Freshful, Zooplus, Bolt, Microsoft, Adobe.

`BrandPicker` în formul de subscripție permite selectare manuală cu opțiunea "Auto" (lasă regex-ul `test` din `BrandLogo` să detecteze din numele subscripției). `BrandTile` randează în liste folosind slug-ul explicit (din `subscriptions.brand_logo`) sau auto-detect prin nume.

### Multi-currency support (9 monede)
**Currencies supportate**: RON, EUR, USD, GBP, CHF, CAD, AUD, HUF, PLN. Toate au curs zilnic publicat de BNR (XML, deja folosit). Type `Currency` în `src/lib/money.ts` + array `CURRENCIES`. Pentru extindere: add la enum + add la SUPPORTED sets în `api/fx.ts`, `api/cron/generate-recurring.ts`, `api/bank/_sync.ts`. Niciun DB migration necesar — coloanele `currency` sunt `text` simple.

**Default currency per user**: setting în Settings → "Monedă implicită". Stocat în `profiles.settings.default_currency` (JSONB). Pre-completează moneda pe **toate** forms-urile de cheltuieli/abonamente/loans/savings/investments/predefined/quick/fixed pentru o intrare nouă. Editarea unei intrări existente păstrează moneda salvată (pattern touched flag — user override e îngheț după prima interacțiune cu Select-ul).

### BNR FX → RON (storage + historical conversion)
- `getFxRate(date, currency)` în `src/lib/fx.ts`
- 1) lookup `fx_rates` table (cache).
- 2) miss → call `/api/fx?date=...&currency=...` (Vercel function).
- 3) `api/fx.ts` parsează BNR XML (`https://bnr.ro/files/xml/years/nbrfxratesYYYY.xml`), găsește cursul cel mai recent ≤ data cerută (fallback weekend/sărbători), upsertează în `fx_rates`.
- În dev, `/api/fx` rulează ca middleware Vite (vezi `vite.config.ts → apiDevMiddleware`).
- Pe expense salvăm `fx_rate` și `fx_rate_date` ca să nu se schimbe rapoartele istorice când BNR re-publică.

**Live FX preview pe formulare**: AddExpensePage, FixedExpenseFormPage, SubscriptionFormPage, BudgetFormPage, LoanFormPage, SavingsFormPage afișează "≈ X (display currency) la cursul BNR din Y" sub Group-ul amount+currency când currency != display currency. Implementat ca `useQuery(['fx', date, currency])` cu `staleTime: 6h` — cache între forms.

**Conversie în liste**: `useFxRates(currencies)` hook care fetch-uiește în masă. Folosit în SubscriptionsListPage, FixedExpensesListPage, FixedExpensesPrePage, QuickExpensesListPage, LoansListPage. Cross-rate calculat client-side: `(amount × rowRate_RON) / displayRate_RON` → conversie corectă către display currency a userului, hide-uit complet când row.currency === displayCurrency.

### Display currency conversion (historical accuracy, Option C-B)
`src/lib/displayCurrency.ts` exportă două hook-uri:
- **`useDisplayConversion(expenses)`** — primește array de cheltuieli, returnează `{ convert, total, formatInDisplay, displayCurrency, isReady }`. Per-expense, convertește la display currency folosind cursul BNR de pe **data fiecărei cheltuieli** (nu de azi). Totalurile istorice rămân stabile zi de zi, nu "respiră" cu FX-ul de azi.
- **`useTodayDisplayRate()`** — variant simplu pentru convertit valori pre-aggregate (ex: budget amount, FX preview) folosind cursul de azi pentru display currency. Mic drift acceptabil pentru valori forward-looking.

**Algoritm per expense** (în display currency D):
- `D === 'RON'` → folosește `amount_ron` direct (pinned la insert, no FX, no drift)
- `currency_original === D` → folosește `amount_original` (nativ, exact)
- altfel → `amount_ron / rate(D, occurred_on)` — cursul istoric pentru moneda de display din ziua cheltuielii

**Cum se manifestă pentru useri**:
- User RON-default → comportament identic cu varianta veche, `amount_ron` direct, zero FX fetch în plus.
- User GBP-default cu majoritar GBP-native expenses → totalul sumează `amount_original` direct pe cheltuielile GBP-native (zero conversie, exact). Pentru cele câteva non-GBP, cross-rate via istoric.
- User mixt → fiecare cheltuială folosește cursul din ziua ei. Sub 1% drift pe sume mari.

**Folosit în**: HomePage total widget, ExpensesListPage (page total + weekly totals + per-row), BudgetProgressBar (spent + remaining + pct), AnalyticsPage (totalSpent, companyCardTotal, byCategory, bySubcategory, weeklyForMonth, monthlyTotals în chart), SavingsListPage sub-line, BudgetsListPage amount per buget.

**De ce on-the-fly, nu denormalized**: stocarea unui `amount_in_display_currency` per expense ar necesita schema migration + backfill batch + re-backfill la fiecare schimbare de display currency. Pe-the-fly cu cache (TanStack Query + Supabase fx_rates) → zero migrare, latency neglijabilă după first fetch (rate-urile istorice sunt immutable).

### Subscriptions: generator dual (client + server)
**Client-side** (`src/features/subscriptions/generator.ts`): la fiecare login (gated cu un flag `bundy.subscriptions.lastRun=YYYY-MM-DD` în localStorage), `runSubscriptionGenerator()`:
- Iterează prin subscripțiile active.
- Pentru fiecare, calculează datele de charge între `today-30d` și `today` (handle săptămânal/lunar/anual + clamping la sfârșit de lună pentru day=31).
- Pentru fiecare dată, verifică dacă există deja expense și inserează dacă nu.

**Server-side** (`api/cron/generate-recurring.ts`, declanșat zilnic la 00:15 UTC de Vercel Cron): rulează aceeași logică pentru TOȚI userii, folosind `SUPABASE_SERVICE_ROLE_KEY` ca să bypass-eze RLS. Cele două generatoare rulează în paralel (idempotent prin partial unique index `(profile_id, source_ref_id, occurred_on) WHERE source='subscription'` în 0001), astfel:
- Userul deschide app-ul → rândurile sunt deja inserate de cron, boot-ul devine ușor mai rapid.
- Userul nu deschide app-ul săptămâni → rândurile apar oricum în DB → totalurile, bugetele, analytics-ul sunt corecte (scenarii cron cover).
- Cronul eșuează (rar) → generator-ul client îl prinde din urmă la următoarea deschidere.

### Rate (împrumuturi bancare)
Modelat ca tabelă separată de subscriptions (`loans`):
- Câmpuri specifice: `bank`, `total_amount` (principal opțional), `monthly_payment`, `charge_day` (1-31), `start_date`, `end_date` (opțional — generator-ul oprește după), `interest_rate` (% anual opțional).
- Generator dual la fel ca subscriptions: client-pull la boot + Vercel Cron daily. Idempotent prin partial unique index `(profile_id, source_ref_id, occurred_on) WHERE source='loan'`.
- Numele cheltuielii generate include banca: "Credit nevoi personale (BCR)".
- Dropdown bancă: `src/data/banks.ts` listează ~20 bănci RO; field-ul e `Autocomplete` deci permite și text liber.
- Categorie default la rată nouă: Finanțe > Credite (auto-precompletat).
- Tag implicit: `loan` pe fiecare expense generată — util pentru filtre Analytics ulterioare.

### "Plătit cu cardul firmei" (company-card tag)
Cheltuielile plătite cu cardul firmei (Claude Max, taxe ANAF, contabil, Freshful pe firmă, Hanul Berarilor cu cardul firmei, etc.) sunt marcate cu tag-ul `company-card` și **excluse din totalul personal**:
- Switch "Plătit cu cardul firmei" pe **toate** formularele de cheltuială: AddExpensePage, FixedExpenseFormPage, SubscriptionFormPage, QuickExpenseFormPage, PredefinedExpenseFormPage, LoanFormPage.
- **Auto-default ON** când categoria selectată e Work & Business (overridable manual).
- **Propagare automată**: template-urile (fixed/quick/predefined) au coloana `tags`; când se generează un expense din template, tag-urile se copiază. Subscription generator + loan generator propagă tag-urile la rândurile create.
- **Badge `firmă`** vizibil în ExpensesListPage și SubscriptionsListPage.
- **Total separat** în HomePage, ExpensesListPage și AnalyticsPage:
  - `Total {luna} · cont personal` (suma fără company-card)
  - `Cont firmă: X RON` (linie secundară, doar dacă există)
- **Excludere în Analytics chart-uri** by default — dar când userul filtrează explicit pe categorie/subcategorie (ex: Work & Business), filtrul de exclusion se dezactivează automat ca să apară totuși cheltuielile drill-down.

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

### Budgets archive (păstrare istoric curat)
Bugetele cu `period_end` mai vechi de **7 zile** dispar din lista principală și se mută într-o pagină separată `/budgets/archive` (constanta `ARCHIVE_THRESHOLD_DAYS` în `BudgetsArchivePage.tsx`).
- Buton-card cu count în BudgetsListPage → tap → pagina Archive
- Filtre: search după nume, categorie, dată de început (de la), dată de sfârșit (până la)
- Paginare 20/pagină cu Mantine `Pagination`
- Click pe un buget → tot deschide form-ul de edit (read-write)

### Analytics — filtre + drill-down
Două Select-uri sus pe AnalyticsPage:
- **Categorie** (single, optional)
- **Subcategorie** (filtrată după categorie, optional)

Când e activ vreun filtru:
- Toate chart-urile (trend lunar, săptămânal, totale, listă subcategorii) reflectă scope-ul.
- Donut-ul "Cheltuieli pe categorii" se ascunde (un slice e meaningless).
- Lista subcategorii arată **toate** (nu top 8) — așa apar cheltuielile mici (bilete loto etc.).
- Excluderea company-card se dezactivează (drill-down inclusiv pe Work & Business).
- Titlul devine "Cheltuieli pe subcategorii" în loc de "Top subcategorii".

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

### OTP-based signup + password reset (PWA-friendly)
**Problema**: iOS PWA standalone-uri nu pot inregistra URL handlers. Click pe link de email → deschide Safari (browser context), NU PWA-ul instalat. Sesiunea creată în Safari nu se sincronizează cu PWA-ul (storage contexts separate). User-ul trebuie să se re-logheze manual în PWA → UX dur.

**Soluția**: în loc de link-based confirmation, folosim **cod OTP de 8 cifre** pe care user-ul îl tastează direct în PWA. Codul vine în email ca number plain (variabila Supabase `{{ .Token }}`). Verificarea via `supabase.auth.verifyOtp({ type: 'signup' / 'recovery' })` creează sesiunea **direct în contextul PWA**.

**Flow signup**:
1. User completează form-ul → `signUp()` → email cu cod 8 cifre
2. UI tranziționează la PinInput cu `oneTimeCode` prop (iOS Mail oferă autofill)
3. User tastează → `verifyOtp({ type: 'signup' })` → sesiune creată în PWA → auto-redirect la `/home`

**Flow reset password**:
1. User cere reset → email cu cod
2. UI: PinInput + 2 PasswordInput pe aceeași pagină
3. Single submit: `verifyOtp({ type: 'recovery' })` → recovery session → `updateUser({ password })` → redirect `/home`

Link fallback rămâne în email pentru cei care preferă (deschide în Safari, comportament vechi).

### Vitest test suite (~96 cazuri, 10 fișiere)
Setup în `vitest.config.ts` + `src/test/setup.ts` (jsdom environment + dayjs plugins preconfigurate).

Acoperă **math critic** unde un bug ar însemna calcule greșite peste tot:
- `splitMonthIntoWeeks` (regula aprilie, edge cases lună scurtă, prima zi sambata/duminica)
- `monthlyEquivalent` pe 7 cadențe + cross-check (50 RON/lună echivalent în toate cadențele)
- `chargeDatesInWindow` pentru subs + loans: 7 cadențe (subs), idempotency property, clamp charge_day=31 pe februarie, stop la end_date
- `suggestCategory` (autocomplete): user rule beats seed, priority ordering, regex match, history fuzzy fallback, diacritics normalization
- `computeBudgetStatus`: toate 5 stări (upcoming/active/warning/exceeded/achieved), edge case exact 90% și exact amount
- `getFxRate`: cache hit + cache miss + network fallback + RON identity
- PIN logic: hash determinism, verify, sliding TTL window, expiration cleanup
- `bankMatcher.normalizeMerchant`: "MEGA IMAGE" → "megaimage", diacritice, mixed-case
- `displayCurrency`: RON pass-through, native match, cross-currency historical, no-drift property

Comenzi:
```bash
npm run test           # rulează o dată
npm run test:watch     # watch mode
npm run test:ui        # Vitest UI în browser
```

Tests **nu** acoperă: componente React (UI tests sunt fragile pentru un small project), API integration end-to-end (acceptăm verify-via-staging), DB queries (RLS testat manual).

### "Reîncarcă aplicația" în PWA standalone
PWA-ul standalone n-are URL bar deci utilizatorul nu poate face Cmd+R. Soluția: NavLink "Reîncarcă aplicația" în pagina "Mai mult", **vizibil doar când** `isStandalonePWA()` returnează `true` (vezi `src/lib/pwa.ts` — `matchMedia('(display-mode: standalone)')` + fallback iOS `navigator.standalone`). Click → toast "Se reîncarcă aplicația…" → `window.location.reload()`.

### Săptămâni grupate (regula aprilie)
`splitMonthIntoWeeks(monthDate)` în `src/lib/dates.ts` returnează:
- Săpt 1 = ziua 1 până la prima duminică (parțială dacă luna nu începe luni).
- Săpt 2..N = Mon-Sun complete.
- Ultima săptămână = Mon → ultima zi a lunii (parțială).

Folosit în `ExpensesListPage` pentru gruparea cheltuielilor și în `AnalyticsPage` pentru bar chart-ul săptămânal.

### i18n bilingv RO/EN
- `react-i18next` cu RO ca limbă default + fallback EN. Toate string-urile aplicației sunt în `src/i18n/locales/{ro,en}.json` (~400 keys).
- **Detectare la primul login**: `navigator.language.startsWith('ro')` → RO; altfel EN. Persistat în `profiles.locale` și sincronizat cu `i18n.changeLanguage()` la load.
- **Switch la run-time**: Settings → "Limbă" → SegmentedControl RO/EN → updatează profilul + se reflectă instant fără reload (`<Trans>` și `t()` reactive prin `useTranslation`).
- **Display name pentru categorii is_system**: `categoryDisplayName(category, t)` în `src/i18n/displayName.ts` traduce numele când `category.is_system === true`, altfel returnează `category.name` (custom user). Funcționează pentru categorii și subcategorii — folosit peste tot unde afișăm un nume seedat.
- **Formatare RO**: dayjs cu locale `ro`, currency `ro-RO` pentru `formatMoney` indiferent de limba UI (sumele de bani arată mereu cu virgula românească).

### Feedback / Suport in-app
**Pagină**: "Mai mult" → "Suport" → `/feedback`. Userul poate:
- Submita bug reports sau feature requests (textarea + select type).
- Vota propunerile existente cu thumbs-up (max 1 vot/user/item).
- Vedea statusul actual: `submitted`, `in_review`, `planned`, `in_progress`, `done`, `rejected`.

**Notifications**: când admin-ul schimbă status-ul unui feedback, trigger-ul `feedback_notify_on_status_change` (migrația 0029) inserează un rând în `feedback_notifications` pentru autorul feedback-ului. Badge-ul roșu pe link-ul Suport din "Mai mult" arată count-ul de notificări necitite (`useUnreadFeedbackCount`). Click pe item în pagina Suport → marcat citit.

**RLS**: pe `feedback` și `feedback_votes` policy `select using (true)` (toți userii văd toate propunerile pentru voting); insert/update doar pe owner sau admin. Admin determinat prin `is_admin()` (migrația 0017).

### Export PDF / CSV pentru cheltuieli
ExpensesListPage → Menu icon (sus-dreapta) → "Exportă PDF" sau "Exportă CSV". Filtrul curent (categorie/subcategorie/lună) se aplică automat la export.

**PDF**: tabel formatat cu `jspdf-autotable`, header cu titlu/perioadă/total, una row per cheltuială (data, nume, categorie, sumă, sumă RON). Antet bronze accent #cc9429.

**CSV**: 1 cheltuială per linie, cu coloane: data, nume, categorie, subcategorie, sumă, monedă, sumă RON, tags. UTF-8 BOM la început ca să se deschidă corect în Excel cu diacritice.

**Code-splitting**: `jsPDF` + `jspdf-autotable` se import-uiesc dinamic (`await import('jspdf')`) doar la click pe export. Astfel chunk-ul `ExpensesListPage` rămâne la ~11.6KB (de la 432KB înainte de lazy).

### Daily DB backup via GitHub Actions
Workflow `.github/workflows/db-backup.yml` rulează zilnic la 02:00 UTC (+ manual trigger):
1. Checkout într-un repo PRIVAT separat (`bundy-backups`) folosind un PAT cu scope `contents:write`.
2. Setup supabase CLI.
3. **Pass 1**: `supabase db dump > schema.sql` (DDL: tables, columns, indexes, RLS policies, triggers, functions).
4. **Pass 2**: `supabase db dump --data-only > data.sql` (INSERTs pentru toate row-urile).
5. Concatenare `schema.sql + data.sql` → gzip → commit în `backups/YYYY-MM-DD.sql.gz` în repo-ul **privat**.
6. Cleanup: șterge backup-uri mai vechi de 30 zile pe push-ul commit-ului.

**Decizia de a folosi un repo separat privat**: dump-ul include `auth.users` (emailuri, parole bcrypt-hashed), `auth.sessions`, `auth.refresh_tokens`, plus toate datele financiare ale userilor. Nu pot sta în repo-ul aplicației, care e public. Repo-ul privat de backup e accesibil doar mie + tokenului din workflow.

**Secrete necesare în repo-ul aplicației**:
- `SUPABASE_DB_URL` — Session pooler (port 5432, host `aws-0-eu-central-1.pooler.supabase.com`). Direct connection e IPv6-only iar GitHub runners n-au IPv6.
- `BACKUP_REPO` — `<owner>/bundy-backups`.
- `BACKUP_REPO_TOKEN` — fine-grained PAT cu `contents:write` doar pe repo-ul de backup.

**Restore**: clonează `bundy-backups` privat → descarcă `.sql.gz` → `gunzip` → rulează în Supabase SQL Editor sau prin `psql`.

### "Card de firmă" — toggle în Settings
Switch în Settings → "Funcționalități" → "Card de firmă" (`profiles.company_card_enabled`):
- **ON**: apar peste tot switch-urile "Plătit cu cardul firmei" pe forms + Total separat pe HomePage/ExpensesListPage/AnalyticsPage + badge "firmă" pe rânduri + excludere automată din total personal.
- **OFF**: UI-ul ascunde toate aspectele company-card; cheltuielile rămân în DB cu tag-ul, dar nu mai sunt tratate separat în UI.
- **Grandfathering**: migrația 0028 setează `company_card_enabled = true` pentru profilele care au deja date taggate company-card (subscriptions, fixed_expenses, expenses, etc.). Profiluri noi: OFF default; switch în Settings activează feature-ul.

**Confirm modal la disable**: dacă userul are deja cheltuieli cu tag-ul company-card, primește o confirmare ("X cheltuieli vor fi tratate ca personale dacă dezactivezi") înainte de toggle OFF.

### Cadențe extinse pe cheltuieli recurente
Subscripția (acum "Cheltuieli recurente") suportă 7 cadențe (migrația 0030):
- **daily** — în fiecare zi (ex: parcare birou). Charge day forțat la 1.
- **weekly** — săptămânal pe weekday selectat (Mon-Sun).
- **biweekly** — la 14 zile, anchored pe prima ocurență a `start_date`'s weekday.
- **monthly** — în fiecare lună pe ziua selectată (1-31, clamp la sfârșit lună pentru 31).
- **quarterly** — la 3 luni, anchored pe `start_date.month % 3`.
- **semiannual** — la 6 luni, anchored pe `start_date.month % 6`.
- **yearly** — anual pe lună+zi specifice.

Form-ul afișează input-urile potrivite în funcție de cadență (daily ascunde charge_day; weekly/biweekly arată weekday picker; monthly/quarterly/semiannual arată day-of-month; yearly arată day+month).

**Echivalent lunar** pentru raportare (`monthlyEquivalent` în `SubscriptionsListPage.tsx`): daily × 30.44, weekly × 4.345, biweekly × 2.17, quarterly ÷ 3, semiannual ÷ 6, yearly ÷ 12.

Generator dual (client + server) updatat cu logica pentru toate 7 cadențele. Idempotent prin partial unique index.

### Sortare cheltuieli pe săptămâni
ExpensesListPage grupează pe săptămâni iso (Mon-start, regula aprilie) și sortează:
- **Primary**: `occurred_on` ASC (ziua cea mai veche prima în săptămână).
- **Tiebreak în aceeași zi**: `created_at` ASC (cheltuiala adăugată ultima apare jos, în ordinea introducerii).

### Design system — bronze accent + glass cards + floating nav
- **Bronze accent** ca culoare principală: `--bundy-accent-gradient: linear-gradient(180deg, #daad3f, #cc9429, #a07820)`. Aplicat peste: BottomNav magnetic ball indicator + FAB (radial-gradient cu highlight la 35%/28%), filled Buttons, filled ActionIcons (cu `color: white !important` pentru contrast), Switch track când checked, SegmentedControl indicator activ, BudgetProgressBar când `color === 'accent'`, ActiveBudgetBanner dots, bar fill în Recharts via SVG `<linearGradient id="bundy-bronze-vertical">`.
- **Glass cards**: toate Paper-urile au `background: rgba(20, 32, 38, 0.55) + backdrop-filter: saturate(160%) blur(18px) + border 1px hairline + border-radius 24px`. Exclude Menu dropdowns, Tooltips, Notifications și BottomNav.
- **Body Aurora gradient**: gradient teal în jurul `#00798C` aplicat prin `body::before { position: fixed; inset: 0; z-index: -1 }`. Pseudo-element fix evită bug-ul iOS Safari PWA cu `background-attachment: fixed` care creează artifacts de rendering la scroll.
- **Floating BottomNav**: capsule pill cu `border-radius: 999px` (> 500px viewport), magnetic ball indicator calculat cu `useLayoutEffect` și animat cu spring physics cubic-bezier. Sub 440px text-ul tab-urilor se ascunde.
- **iOS scroll fix pe sortable lists**: `touch-action: none` aplicat DOAR pe grip ActionIcon (elementul cu `{...listeners}` spread de la dnd-kit), nu pe Paper-ul rândului. Așa scroll-ul vertical pe body funcționează nativ pe iOS / mobile.

### DnD reorder pe template-uri
`@dnd-kit/sortable` cu `PointerSensor` (`activationConstraint: { distance: 6 }`) pe:
- Categories (CategoriesListPage)
- Quick expenses (QuickExpensesListPage)
- Predefined expenses (PredefinedExpensesListPage)
- Fixed expenses (FixedExpensesListPage)
- Budgets (BudgetsListPage)

Drop → `useReorder*.mutate(idsArray)` care updatează `sort_order = index` în Supabase paralel.

### Economii & Investiții (decuplate de cheltuieli)
Banii puși deoparte într-un depozit / vault / fond de pensii / ETF nu sunt cheltuieli — sunt **transferuri între conturi sau clase de active**. Tracking-ul lor ca expense umfla totalul personal. Soluția: 2 tabele dedicate, în secțiune separată din "Mai mult".

**Tabele:**
- `savings_transactions` — depozit/retragere, cu `account_name` (ex: Revolut Vault, BCR Economii)
- `investment_transactions` — cumpărare/vânzare, cu `instrument_type` (8 valori: pension, etf, mutual_fund, stock, bonds, crypto, real_estate, other) + `broker`

Ambele au: `direction ('in'|'out')`, FX la save (`amount_ron`, `fx_rate`, `fx_rate_date`), `tags`, RLS pe profile_id.

**Pagini:**
- `/savings` și `/investments` — listing cu filtre avansate (search, direction, account/instrument/broker, dată-de la/până la), paginare 20/pagină, widget total inline
- `/savings/new`, `/savings/:id/edit`, `/investments/new`, `/investments/:id/edit` — forms cu FX preview live

**Default currency**: EUR la depozit nou de economii (cele mai comune cazuri sunt în EUR — Revolut Vault, depozite bancare). Editarea unei tranzacții existente păstrează moneda salvată.

**Widget total — sumare nativă în EUR**: în loc să sumăm `amount_ron` și să împărțim la cursul de azi (lossy round-trip), însumăm direct în EUR. Pentru tranzacții EUR-native folosim `amount`, pentru RON-native împărțim la `eurRate` curent, pentru USD folosim cross-rate. Așa 1100 EUR + 1500 EUR = exact 2600 EUR în widget. RON apare ca linie secundară mai mică = `totalEur × cursul de azi` (valoarea curentă a economiilor în RON).

**Migrare automată din expense-uri vechi** (vezi `0026_savings_investments.sql`): orice cheltuială linkuită la subcategoria `savings` sau `investments` se mută în noile tabele cu direction='in' și (pentru investiții) instrument_type='other'. Apoi cheltuielile se șterg din `expenses` (nu mai poluează totalul) și subcategoriile se elimină de la toate profilurile.

**Pentru useri noi**: scoase din `subcategories.seed.ts`. La signup, `bootstrap_profile()` nu le mai creează — Finanțe rămâne cu doar Taxe & Impozite + Credite. Pagina /savings și /investments sunt accesibile cu empty state din primul login.

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

### 1. Pre-flight
```bash
npm run build           # trebuie să treacă fără erori
git add -A && git commit -m "..." && git push
```

### 2. Vercel project
1. https://vercel.com → New Project → import repo. Framework auto-detectat (Vite).
2. **Install Command**: dacă build eșuează cu peer-dep errors, schimbă la `npm install --legacy-peer-deps`.
3. Project Settings → Environment Variables (toate `Production, Preview` — NU Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (fără prefix VITE_; folosit de `api/fx.ts` și `api/cron/generate-recurring.ts`)
   - `VITE_HCAPTCHA_SITE_KEY`
   - `CRON_SECRET` — generează cu `openssl rand -base64 32`. Folosit ca `Bearer` token de Vercel Cron pentru a autentifica request-ul către `/api/cron/generate-recurring`.
4. Deploy. URL preview e `bundy-xxx.vercel.app`.
5. Settings → Cron Jobs — verifică că apare `generate-recurring` cu schedule `15 0 * * *`. Buton "Run now" pentru test manual (bypass automat la Deployment Protection).

### 3. Custom domain
1. Project → Settings → Domains → adaugă `bundy.ro` și `www.bundy.ro`.
2. Vercel afișează 2 nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`.
3. La ROTLD (rotld.ro) → panel domeniu `bundy.ro` → secțiunea Nameservers → schimbă la cele de la Vercel.
4. Așteaptă propagare DNS (1-24h, de obicei < 2h). SSL Let's Encrypt automat după DNS valid.

### 4. Update Supabase pentru prod
- Authentication → URL Configuration:
  - Site URL: `https://bundy.ro`
  - Redirect URLs: `https://bundy.ro/**`, `https://www.bundy.ro/**`, `http://localhost:5173/**` (păstrează pentru dev)

### 5. Update hCaptcha pentru prod
- Dashboard hCaptcha → site → adaugă `bundy.ro` la hostnames (dacă opțiunea există în UI-ul curent)
- Vercel env vars: confirmă că `VITE_HCAPTCHA_SITE_KEY` e setată — fără ea, captcha nu apare iar login eșuează cu "no captcha_token found"

### 6. Deployment Protection (Vercel)
By default, deploy-urile noi pe Hobby au Deployment Protection activată — orice request extern primește redirect la Vercel SSO. Cronul programat **funcționează oricum** (Vercel îl invocă intern, bypass automat) dar `curl` manual de test e blocat.

Pentru testing extern: Settings → Deployment Protection → fie schimbă la "Only Preview Deployments" (production rămâne expus), fie generează un Protection Bypass Token și include-l ca header `x-vercel-protection-bypass: $TOKEN`.

### 7. Verificări post-deploy
```bash
# DNS propagat la Vercel?
dig @1.1.1.1 bundy.ro A +short        # trebuie IP Vercel (76.76.21.x sau 64.29.17.x)

# HTTP merge?
curl -sIL https://bundy.ro/ | head -10

# noindex headers?
curl -I https://bundy.ro/ | grep -i robots   # trebuie x-robots-tag: noindex, nofollow

# robots.txt?
curl https://bundy.ro/robots.txt              # trebuie User-agent: *\nDisallow: /

# Cron OK? (după disable Deployment Protection sau cu bypass token)
curl -H "Authorization: Bearer $CRON_SECRET" https://bundy.ro/api/cron/generate-recurring
# Răspuns așteptat: {"ok":true,"ranAt":"...","subscriptions":{"created":N,...},"loans":{...}}
```

### iOS PWA install
1. Deschide `https://bundy.ro` în Safari pe iPhone.
2. Share button (jos centru) → "Add to Home Screen" → "Bundy".
3. Lansează din home screen → app standalone, fără bară Safari.
4. Login persistent (custom storage adapter localStorage + IndexedDB) → după 7+ zile inactivitate ar trebui să fii încă logat.
5. NavLink "Reîncarcă aplicația" disponibil în "Mai mult" pentru manual refresh (PWA n-are pull-to-refresh nativ).

### Troubleshooting deploy

**Site returnează "Invalid Configuration" în Vercel după >2h**:
- Verifică nameservers în ROTLD: `dig bundy.ro NS +short` — trebuie să vezi `ns1.vercel-dns.com.` și `ns2.vercel-dns.com.`
- Dacă apare gol de la resolverul tău local, încearcă cu DNS public: `dig @1.1.1.1 bundy.ro NS +short`
- Cache local pe Mac: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` apoi restart browser

**Curl la `/api/cron/generate-recurring` returnează "Redirecting..."**:
- Vercel Deployment Protection. Vezi secțiunea 6.

**Cron-ul nu rulează la 00:15 UTC**:
- Vercel Dashboard → Project → Crons tab → vezi "Last execution" și logs
- Funcția returnează `Unauthorized` → `CRON_SECRET` lipsește din Vercel env vars
- Funcția returnează `Missing Supabase env vars` → `SUPABASE_SERVICE_ROLE_KEY` sau `VITE_SUPABASE_URL`/`SUPABASE_URL` lipsesc

**Build Vercel eșuează "ERESOLVE peer deps"**:
- Settings → General → Install Command → `npm install --legacy-peer-deps` → Save → Redeploy

---

## Adăugarea de funcționalități în viitor

### Cum sunt organizate features
Fiecare feature stă în `src/features/<feature>/` cu:
- `api.ts` — TanStack Query hooks (use<X>, useUpsert<X>, useDelete<X>, useReorder<X>) folosind `supabase` client
- `*Page.tsx` — pagini routate
- Componente specifice features

Hooks-urile invalidează `queryKey` la mutații pentru sync UI.

### Schimbarea/adăugarea de categorii sau brand rules
- Categorii noi: editează `src/data/categories.seed.ts` — apar la useri NOI (la bootstrap). Pentru tine, adaugă-le manual din UI sau printr-un INSERT SQL.
- Subcategorii noi: editează `src/data/subcategories.seed.ts` + creează o migrație care le inserează în `subcategories` pentru profilurile existente (vezi `0021_vacation_subcategories.sql` ca template).
- Brand rules noi: editează `src/data/brandRules.seed.ts`. Pattern lowercase + `category_slug` (+ optional `subcategory_slug`, `priority`). Re-deploy = active imediat.
- Brand logos noi: dacă există în simple-icons, adaugă o linie `fromSi(siXyz, 'slug', 'Label', /regex/)` în `src/data/brandLogos.ts`. Dacă nu, descarcă SVG/PNG din press kit oficial → `public/brands/{slug}.svg` și adaugă `staticBrand('slug', 'Label', /regex/, hex, '/brands/slug.svg')`.

### Adăugarea unei migrări DB
1. Creează `supabase/migrations/000N_my_change.sql` cu numerotare incrementală.
2. Idempotent: `add column if not exists`, `where not exists` pe inserts, etc.
3. Rulează în Supabase SQL Editor.
4. Documentează în lista din README structure.

### Modificări de schemă pe tabele cu RLS
RLS e activă pe toate tabelele profile-scoped. Când adaugi o coloană nouă: nu te afectează policies-urile existente (sunt pe whole-row, nu pe coloane). Când adaugi un tabel nou: ENABLE RLS + adaugă policy `members all` ca în 0001 (vezi loop-ul cu `tables array`).

### Adăugarea unui chart nou în Analytics
- `src/features/analytics/api.ts` are `useExpensesInRange` care fetch-uiește toate cheltuielile dintr-un interval.
- În `AnalyticsPage.tsx` adaugă un nou `useMemo` pentru aggregarea ta + un `<BarChart>` / `<DonutChart>` / `<LineChart>` din `@mantine/charts`.
- Pentru axe Y cu sume mari, folosește `compactRon` (ex: 1.2k, 12k) prin `yAxisProps={{ tickFormatter: compactRon }}`.
- Filtrul existing pe categorie/subcategorie e disponibil prin `filterCategory`/`filterSubcategory` state și `personalExpenses`/`companyCardExpenses` derivate.

### Reset complet pentru un user
```sql
DELETE FROM expenses WHERE profile_id = '<uuid>';
DELETE FROM subscriptions WHERE profile_id = '<uuid>';
DELETE FROM budgets WHERE profile_id = '<uuid>';
DELETE FROM fixed_expenses WHERE profile_id = '<uuid>';
DELETE FROM quick_expenses WHERE profile_id = '<uuid>';
DELETE FROM predefined_expenses WHERE profile_id = '<uuid>';
DELETE FROM loans WHERE profile_id = '<uuid>';
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

### Categoriile apar în engleză
Migrația `0005_translate_seeded_names.sql` nu a fost aplicată sau categoriile au fost create manual (nu prin bootstrap, deci `is_system=false` și nu se traduc).

### Subscription generator nu rulează
Verifică DevTools → Console pentru `[bundy] subscription generator failed`. Cele mai frecvente: 
- `getFxRate` eșuează în dev pentru că BNR XML e mare → așteaptă 1-2 secunde după login.
- Flag-ul `bundy.subscriptions.lastRun` în localStorage previne re-rularea în aceeași zi. Șterge-l manual ca să forțezi rerularea.
- În prod, cronul server-side rulează oricum la 00:15 UTC — verifică Vercel Cron logs.

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

### Cheltuielile cu cardul firmei n-apar în filtru Analytics
Bug deja reparat: când e activ filtrul pe categorie/subcategorie, excluderea company-card se dezactivează automat ca să apară totuși cheltuielile drill-down. Vezi `personalExpenses` useMemo în `AnalyticsPage.tsx`.

---

## Decizii de design (de ce așa)

- **Categorie primară + tags**, NU multi-category sau split allocations: analytics curate, fără double-counting. Claude Max → primary `work-business` + tag `subscription` + tag `company-card`.
- **Generator dual subscription/loans (client + server cron)**: client-pull la boot pentru responsiveness, Vercel Cron daily pentru data correctness când userul e offline. Idempotent prin unique index.
- **No SSR (SPA Vite)**: nu vrem indexare Google, sesiunea e per-user, SSR ar fi overhead inutil.
- **Mantine v7** peste shadcn: `DatePicker type="multiple"` rezolvă calendarul de buget direct, AppShell + DatesProvider + Charts coerent estetic.
- **Supabase peste Firebase**: Postgres + RLS + auth integrat = data model relațional curat, free tier suficient pentru ~10 useri.
- **simple-icons + static fallback** peste un singur sistem unificat: simple-icons (CC0) acoperă brand-urile mainstream cu zero efort, iar pentru cele lipsă (deprecated la cererea brand owners — Adobe, Microsoft, LinkedIn) păstrăm SVG-uri oficiale ca fișiere statice. Zero JS bundle bloat (path data tree-shaken).
- **Pre-page Add Expense**: 1-tap adăugare pentru cheltuieli recurente non-automate (terapie, chirie când nu e exact aceeași sumă) e flow-ul cel mai folosit în practică.
- **Săptămâni încadrate strict în lună (regula aprilie)**: simplifică totalurile lunare, nu mai trebuie reguli speciale pentru săpt extinse cross-lună.
- **Company-card tag exclus din total personal default**: tracking-ul e pentru bani care ies din contul tău. Banii firmei trec prin contul tău (cardul firmei) dar nu sunt cheltuiala ta — separarea vizuală evită confuzia "Why am I 5000 RON in the red?".
- **Budgets archive după 7 zile**: lista principală curată; bugetele expirate utile pentru context istoric, dar nu trebuie să le vezi mereu.
- **Economii & Investiții ca secțiune separată, nu subcategorii** de Finanțe: depozitele și investițiile sunt transferuri între active, nu consum. Le ținem în tabele dedicate (`savings_transactions`, `investment_transactions`) cu propria UX (direction in/out, breakdown per cont/instrument). Așa totalul de cheltuieli reflectă strict bani consumați, iar economiile/investițiile au tracking propriu cu vizibilitate în EUR.
- **Sumare nativă în EUR pentru economii**, nu round-trip prin RON: `amount_ron` salvat la cursul istoric e ireconciliabil când vrei totalul curent în EUR. Sumăm direct în moneda țintă (EUR pentru savings, RON pentru investments) ca să eliminăm pierderea de precizie din conversie dublă (EUR → RON@istoric → EUR@azi).
- **i18n cu RO ca default** și fallback EN: limba primară a userului-țintă e română, dar EN deschide aplicația pentru demo / screenshots / portfolio. Categoriile is_system se traduc prin lookup pe slug (nu pe `name` direct) ca să respectăm și customizările locale ale userului (un user care a redenumit categoria în UI vede numele lui, nu traducerea).
- **Glass blur acceptat pe carduri**: backdrop-filter saturate(160%) blur(18px) e expensive pe compositor dar visual diferențiază aplicația semnificativ. Risk-ul de sacadare a fost mitigat prin (1) fixarea body gradient într-un `body::before` pseudo-element, (2) `touch-action: none` izolat pe grip handle-uri (nu pe Paper) ca să elibereze main thread la scroll. Dacă reapare lag, se scoate.
- **PDF/CSV export prin lazy import**: `jsPDF` + `jspdf-autotable` sunt heavy (~420KB combined). Userul folosește export poate o dată pe lună, deci nu plătim cost-ul în initial bundle — `await import('jspdf')` la click.
- **DB backup în GitHub Actions, NU în Supabase Pro paid backups**: free tier-ul Supabase nu include backup-uri automate descărcabile. Workflow-ul cron daily oferă același rezultat (gzipped SQL în repo) cu zero cost. Session pooler pentru IPv4 connectivity din GitHub runners.
- **Display currency conversion on-the-fly (Option C-B), NU denormalized columns**: stocarea unei coloane `amount_in_display_currency` per expense ar fi necesitat schema migration + backfill batch pentru toate cheltuielile istorice + re-backfill la fiecare schimbare de display currency. Pe-the-fly cu cache (TanStack Query + Supabase fx_rates table deja existentă) → zero migrare, latency neglijabilă după first fetch (BNR rates istorice sunt immutable). Per-expense convertit la cursul **din data cheltuielii**, nu de azi — totaluri istorice stabile zi de zi.
- **OTP code în loc de magic link pentru auth flows**: PWA-urile pe iOS nu pot înregistra URL handlers. Click-ul pe un link de email deschide Safari (browser context), nu PWA-ul standalone (alt context, alt storage). Sesiunea creată în Safari nu se sincronizează cu PWA-ul → user trebuie să se re-logheze manual. Cu OTP code, user-ul tastează codul direct în PWA → sesiune creată în context-ul corect. Link-ul rămâne ca fallback în email pentru cei care preferă.
- **Custom SMTP via Resend pentru emails branded + rate limit**: Supabase default SMTP are rate limit ~3-4/oră per project și sender hardcoded la `noreply@mail.app.supabase.io`. Resend free 3000/lună + custom domain → emailurile vin de la `Bundy <noreply@bundy.ro>`, fără rate limit până la zeci de signup-uri simultani.
- **Vitest peste Jest** pentru tests: vine cu Vite, sintaxă identică, zero config extra. Acoperă math critic (FX, cadențe, budget state, PIN, autocomplete, merchant matching) — exact unde un bug ar afecta utilizatori pe tăcute. Skip pe UI tests fragile + integration end-to-end (cost mare, beneficiu mic pentru un app cu un user).
