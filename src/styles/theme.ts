import { createTheme, MantineColorsTuple } from '@mantine/core';

/**
 * Bronze gold accent palette around #cc9429 (index 6 = filled). Darker, more
 * saturated than the previous sunny gold — reads as "authentic metallic" vs
 * "pop yellow". Strong tonal contrast against the teal body bg.
 */
const accent: MantineColorsTuple = [
  '#faf3e1',
  '#f5e5b8',
  '#ecd285',
  '#e2bf5b',
  '#daad3f',
  '#d2a232',
  '#cc9429',
  '#ae7d23',
  '#8f661c',
  '#664815',
];

export const theme = createTheme({
  primaryColor: 'accent',
  colors: { accent },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  headings: {
    sizes: {
      // h2 used across pages (page titles, section headers); 22px reads better
      // than the Mantine default (~26px) on mobile-first layouts.
      h2: { fontSize: '22px' },
    },
  },
  components: {
    Button: {
      defaultProps: { radius: 'md' },
    },
    NumberInput: {
      defaultProps: { hideControls: true },
    },
  },
});
