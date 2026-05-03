import { create } from 'zustand';

const RECENT_KEY = 'bundy.search.recent';
const MAX_RECENT = 5;

type SearchState = {
  open: boolean;
  recent: string[];
  setOpen: (open: boolean) => void;
  addRecent: (q: string) => void;
  clearRecent: () => void;
};

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function persistRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export const useSearchStore = create<SearchState>((set, get) => ({
  open: false,
  recent: typeof window !== 'undefined' ? loadRecent() : [],
  setOpen: (open) => set({ open }),
  addRecent: (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    const current = get().recent;
    const next = [trimmed, ...current.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      MAX_RECENT,
    );
    persistRecent(next);
    set({ recent: next });
  },
  clearRecent: () => {
    persistRecent([]);
    set({ recent: [] });
  },
}));
