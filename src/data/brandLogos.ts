/**
 * Brand logos for known subscriptions and recurring services.
 *
 * Two sources, unified behind the same `BrandLogo` shape:
 *   1. simple-icons (CC0 community-built brand SVGs, tree-shaken per-brand from
 *      the npm package). Renders inline as <svg><path/></svg> with the brand hex.
 *   2. Static SVG files in /public/brands/ — fallback for brands that are not in
 *      simple-icons (either deprecated by trademark request or never added).
 *
 * To add a new brand:
 *   - If it exists in simple-icons → add a `fromSi(...)` line.
 *   - If not → drop an SVG in /public/brands/{slug}.svg and add a `staticBrand(...)` line.
 */
import {
  siNetflix,
  siClaude,
  siYoutube,
  siApplemusic,
  siIcloud,
  siHbo,
  siPlex,
  siInstagram,
  siUber,
  siGlovo,
  siRevolut,
  siApple,
  siZoom,
  type SimpleIcon,
} from 'simple-icons';

export type BrandLogo = {
  slug: string;
  label: string;
  test: RegExp;
  /** Brand color hex (no leading #) — used for tile background tint */
  hex: string;
  /** Foreground color override for inline SVGs (no leading #). Defaults to `hex`. */
  fg?: string;
  /** SVG path d-attr when sourced from simple-icons (24×24 viewBox) */
  path?: string;
  /** Public asset URL when sourced from /public/brands/ */
  src?: string;
};

function fromSi(
  si: SimpleIcon,
  slug: string,
  label: string,
  test: RegExp,
  fg?: string,
): BrandLogo {
  return { slug, label, test, hex: si.hex, path: si.path, fg };
}

function staticBrand(
  slug: string,
  label: string,
  test: RegExp,
  hex: string,
  /** Override the asset path. Defaults to `/brands/{slug}.svg`. */
  src?: string,
): BrandLogo {
  return { slug, label, test, hex, src: src ?? `/brands/${slug}.svg` };
}

export const BRAND_LOGOS: BrandLogo[] = [
  // — simple-icons (CC0) —
  fromSi(siNetflix,    'netflix',     'Netflix',     /netflix/i),
  fromSi(siClaude,     'anthropic',   'Claude',      /claude|anthropic/i),
  fromSi(siYoutube,    'youtube',     'YouTube',     /youtube/i),
  fromSi(siApplemusic, 'apple-music', 'Apple Music', /apple\s*music/i),
  fromSi(siIcloud,     'icloud',      'iCloud',      /icloud/i),
  fromSi(siHbo,        'hbo',         'HBO',         /\bhbo\b|\bmax\b/i,        'FFFFFF'),
  fromSi(siPlex,       'plex',        'Plex',        /\bplex\b/i),
  fromSi(siInstagram,  'instagram',   'Instagram',   /instagram/i),
  fromSi(siUber,       'uber',        'Uber',        /\buber\b/i),
  fromSi(siGlovo,      'glovo',       'Glovo',       /glovo/i),
  fromSi(siRevolut,    'revolut',     'Revolut',     /revolut/i),
  fromSi(siApple,      'apple',       'Apple',       /\bapple\b(?!\s*music)/i),
  fromSi(siZoom,       'zoom',        'Zoom',        /\bzoom\b/i),

  // — static fallback (not in simple-icons; SVG/PNG/JPEG hand-placed in /public/brands/) —
  staticBrand('openai',       'ChatGPT',     /chatgpt|openai/i,                '10A37F'),
  staticBrand('linkedin',     'LinkedIn',    /linkedin/i,                      '0A66C2'),
  staticBrand('disney-plus',  'Disney+',     /disney/i,                        '113CCF'),
  staticBrand('skyshowtime',  'SkyShowtime', /skyshowtime/i,                   '5B0DDB'),
  staticBrand('antena-play',  'AntenaPlay',  /antena\s*play/i,                 'E50914', '/brands/antenaplay.jpeg'),
  staticBrand('prime-video',  'Prime Video', /prime\s*video|amazon\s*prime/i,  '00A8E1', '/brands/primevideo.png'),
  staticBrand('voyo',         'Voyo',        /\bvoyo\b/i,                      'FF1A1A', '/brands/voyo.jpeg'),
  staticBrand('stepsapp',     'StepsApp',    /steps\s*app/i,                   '4D88FF', '/brands/stepsapp.jpeg'),
  staticBrand('emag',         'eMAG',        /emag/i,                          'FFC22E'),
  staticBrand('freshful',     'Freshful',    /freshful/i,                      '00B564'),
  staticBrand('zooplus',      'Zooplus',     /zooplus/i,                       '66B3FF', '/brands/zooplus.png'),
  staticBrand('bolt',         'Bolt',        /\bbolt\b/i,                      '34D186'),
  staticBrand('adobe',        'Adobe',       /\badobe\b/i,                     'FF0000'),
  staticBrand('microsoft',    'Microsoft',   /\bmicrosoft\b/i,                 '5E5E5E'),
];

const BY_SLUG = new Map(BRAND_LOGOS.map((b) => [b.slug, b]));

export function findBrandLogoBySlug(slug: string | null | undefined): BrandLogo | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

export function findBrandLogoByName(name: string | null | undefined): BrandLogo | null {
  if (!name) return null;
  return BRAND_LOGOS.find((b) => b.test.test(name)) ?? null;
}

export function findBrandLogo(
  name: string | null | undefined,
  slug?: string | null,
): BrandLogo | null {
  return findBrandLogoBySlug(slug) ?? findBrandLogoByName(name);
}
