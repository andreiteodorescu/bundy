import type { BrandLogo } from '@/data/brandLogos';

type Props = {
  brand: BrandLogo;
  size: number;
};

/**
 * Render a brand logo. Two modes:
 *   - simple-icons: inline <svg><path/></svg> filled with the brand hex
 *   - static asset: <img src=...> for brands not in simple-icons
 */
export function BrandGlyph({ brand, size }: Props) {
  if (brand.path) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={`#${brand.fg ?? brand.hex}`}
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <path d={brand.path} />
      </svg>
    );
  }
  // Static raster/SVG: fill the parent box (caller controls outer dims via padding)
  // so wide logos get the full available width instead of being letterboxed small.
  return (
    <img
      src={brand.src}
      alt=""
      loading="lazy"
      decoding="async"
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}
