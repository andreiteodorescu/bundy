import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeQueryChain(result: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  const fn = vi.fn(() => chain);
  Object.assign(chain, {
    select: fn, eq: fn, lte: fn, order: fn, limit: fn,
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  });
  return chain;
}

let supabaseMock: ReturnType<typeof makeQueryChain>;
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => supabaseMock),
  },
}));

beforeEach(() => {
  supabaseMock = makeQueryChain({ data: null });
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-12T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('getFxRate', () => {
  it('RON returns identity { rate_to_ron: 1 }', async () => {
    const { getFxRate } = await import('./fx');
    const rate = await getFxRate('2026-05-12', 'RON');
    expect(rate).toEqual({ date: '2026-05-12', currency: 'RON', rate_to_ron: 1 });
  });

  it('today/future date → live fetch from /api/fx', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        date: '2026-05-12', currency: 'EUR', rate_to_ron: 4.97,
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getFxRate } = await import('./fx');
    const rate = await getFxRate('2026-05-12', 'EUR');

    expect(fetchMock).toHaveBeenCalledWith('/api/fx?date=2026-05-12&currency=EUR');
    expect(rate.rate_to_ron).toBe(4.97);
  });

  it('past date with cache hit → returns cached value, no fetch', async () => {
    supabaseMock = makeQueryChain({
      data: { date: '2026-04-15', currency: 'EUR', rate_to_ron: 4.95 },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getFxRate } = await import('./fx');
    const rate = await getFxRate('2026-04-15', 'EUR');

    expect(rate.rate_to_ron).toBe(4.95);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('past date with cache miss → falls back to /api/fx', async () => {
    supabaseMock = makeQueryChain({ data: null });
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        date: '2025-01-15', currency: 'USD', rate_to_ron: 4.42,
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getFxRate } = await import('./fx');
    const rate = await getFxRate('2025-01-15', 'USD');

    expect(fetchMock).toHaveBeenCalled();
    expect(rate.rate_to_ron).toBe(4.42);
  });

  it('today + network error + cache available → returns cached fallback', async () => {
    supabaseMock = makeQueryChain({
      data: { date: '2026-05-11', currency: 'EUR', rate_to_ron: 4.96 },
    });
    const fetchMock = vi.fn(async () => { throw new Error('Network down'); });
    vi.stubGlobal('fetch', fetchMock);

    const { getFxRate } = await import('./fx');
    const rate = await getFxRate('2026-05-12', 'EUR');

    expect(rate.rate_to_ron).toBe(4.96);
    expect(rate.date).toBe('2026-05-11');
  });

  it('past date with cache miss + /api/fx 404 → throws', async () => {
    supabaseMock = makeQueryChain({ data: null });
    const fetchMock = vi.fn(async () => new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const { getFxRate } = await import('./fx');
    await expect(getFxRate('2010-01-01', 'EUR')).rejects.toThrow(/Failed to fetch BNR/);
  });
});
