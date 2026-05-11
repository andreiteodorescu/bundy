import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TFunction } from 'i18next';
import { formatRon } from '@/lib/money';
import { cleanExpenseName } from '@/lib/text';
import type { Category, Expense, Subcategory } from '@/types';

type Maps = {
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
  /** Localized category name resolver (so user-system-defined translations work). */
  resolveCategoryName: (cat: Category | null) => string;
  resolveSubcategoryName: (sub: Subcategory | null) => string;
};

type Totals = {
  personalTotal: number;
  companyCardTotal: number;
};

function buildRows(expenses: Expense[], maps: Maps) {
  return expenses
    .slice()
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    .map((e) => {
      const cat = e.category_id ? (maps.catById.get(e.category_id) ?? null) : null;
      const sub = e.subcategory_id ? (maps.subById.get(e.subcategory_id) ?? null) : null;
      const catName = maps.resolveCategoryName(cat);
      const subName = sub ? maps.resolveSubcategoryName(sub) : '';
      const fullCategory = subName ? `${catName} › ${subName}` : catName;
      const original = e.currency_original !== 'RON'
        ? `${e.amount_original} ${e.currency_original}`
        : '';
      return {
        date: dayjs(e.occurred_on).format('YYYY-MM-DD'),
        name: cleanExpenseName(e.name),
        category: fullCategory,
        amount: Number(e.amount_ron),
        original,
        isCompany: e.tags?.includes('company-card') ?? false,
      };
    });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportExpensesCsv(opts: {
  expenses: Expense[];
  monthLabel: string;
  maps: Maps;
  t: TFunction;
}) {
  const rows = buildRows(opts.expenses, opts.maps);
  const header = [
    opts.t('expenses.export.pdfColDate'),
    opts.t('expenses.export.pdfColName'),
    opts.t('expenses.export.pdfColCategory'),
    opts.t('expenses.export.pdfColAmount'),
    opts.t('expenses.export.pdfColOriginal'),
    opts.t('expenses.badges.company'),
  ];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        csvEscape(r.name),
        csvEscape(r.category),
        r.amount.toFixed(2),
        csvEscape(r.original),
        r.isCompany ? '1' : '',
      ].join(','),
    );
  }
  // UTF-8 BOM so Excel opens it as UTF-8 directly (otherwise diacritics break).
  const blob = new Blob(['﻿', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `bundy-expenses-${opts.monthLabel}.csv`);
}

export function exportExpensesPdf(opts: {
  expenses: Expense[];
  monthLabel: string;
  monthDisplay: string;
  totals: Totals;
  companyCardEnabled: boolean;
  maps: Maps;
  t: TFunction;
}) {
  const rows = buildRows(opts.expenses, opts.maps);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.t('expenses.export.pdfTitle', { month: opts.monthDisplay }), margin, margin + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(
    opts.t('expenses.export.pdfSubtitle', { date: dayjs().format('DD MMM YYYY HH:mm') }),
    margin,
    margin + 24,
  );

  // Totals strip on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text(
    opts.t('expenses.export.pdfTotalLine', { amount: formatRon(opts.totals.personalTotal) }),
    pageW - margin,
    margin + 8,
    { align: 'right' },
  );
  if (opts.companyCardEnabled && opts.totals.companyCardTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(
      opts.t('expenses.export.pdfCompanyLine', { amount: formatRon(opts.totals.companyCardTotal) }),
      pageW - margin,
      margin + 24,
      { align: 'right' },
    );
  }

  autoTable(doc, {
    startY: margin + 44,
    head: [[
      opts.t('expenses.export.pdfColDate'),
      opts.t('expenses.export.pdfColName'),
      opts.t('expenses.export.pdfColCategory'),
      opts.t('expenses.export.pdfColAmount'),
      opts.t('expenses.export.pdfColOriginal'),
    ]],
    body: rows.map((r) => [
      r.date,
      r.name + (opts.companyCardEnabled && r.isCompany ? `  [${opts.t('expenses.badges.company')}]` : ''),
      r.category,
      r.amount.toFixed(2),
      r.original,
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [79, 108, 194], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: {
      0: { cellWidth: 70 },
      3: { halign: 'right', cellWidth: 80 },
      4: { halign: 'right', cellWidth: 80, textColor: 120 },
    },
    margin: { left: margin, right: margin },
  });

  doc.save(`bundy-expenses-${opts.monthLabel}.pdf`);
}
