import { Box } from '@mantine/core';
import { findBrandLogo } from '@/data/brandLogos';
import { getIcon } from '@/data/icons.registry';
import { BrandGlyph } from './BrandGlyph';

type Props = {
  /** Subscription/expense name used to detect the brand when no slug is given */
  name: string;
  /** Explicit brand slug (e.g. 'netflix'). Wins over name auto-detection. */
  brandSlug?: string | null;
  /** Fallback Tabler icon name when no brand match */
  fallbackIconName: string | null | undefined;
  /** Fallback tile color (typically the category color) */
  fallbackColor: string;
  /** Outer tile size in px (default 36) */
  size?: number;
  /** Logo / icon size in px (default size - 16) */
  iconSize?: number;
};

/**
 * Brand-aware tile.
 *   1. Explicit `brandSlug` (user-picked) — uses that brand's logo.
 *   2. Else regex match `name` against known brands.
 *   3. Else fall back to Tabler icon + category color.
 *
 * SVGs come from /public/brands/, served as static + SW-cached. Zero JS bundle impact.
 */
export function BrandTile({
  name,
  brandSlug,
  fallbackIconName,
  fallbackColor,
  size = 36,
  iconSize,
}: Props) {
  const brand = findBrandLogo(name, brandSlug);
  const innerSize = iconSize ?? size - 16;

  if (brand) {
    const isStatic = !brand.path;
    return (
      <Box
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: `#${brand.hex}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          // Static (often wide-aspect) logos fill the tile minus 3px breathing room;
          // inline simple-icons stay at the smaller centered size.
          padding: isStatic ? 3 : 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <BrandGlyph brand={brand} size={innerSize} />
      </Box>
    );
  }

  const Icon = getIcon(fallbackIconName);
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: `${fallbackColor}22`,
        color: fallbackColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
      }}
    >
      <Icon size={innerSize} stroke={2} />
    </Box>
  );
}
