-- Adaugă opțiunea per-buget de a INCLUDE cheltuielile pe firma (tag `company-card`)
-- în calculul "spent". Default false — restul appului (Home, Analytics, Expenses list)
-- exclude company-card din totaluri, deci bugetele trebuie să facă același lucru by default.
-- User-ul poate activa per buget dacă vrea să urmărească împreună.
-- Idempotent: re-rulabil safe.

alter table public.budgets
  add column if not exists include_company_card boolean not null default false;
