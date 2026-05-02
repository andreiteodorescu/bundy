import { createTheme, MantineColorsTuple } from '@mantine/core';

const accent: MantineColorsTuple = [
  '#eef3ff',
  '#dde4f5',
  '#b8c5e6',
  '#90a3d8',
  '#6f87cc',
  '#5a75c5',
  '#4f6cc2',
  '#405bac',
  '#37519a',
  '#2a4589',
];

export const theme = createTheme({
  primaryColor: 'accent',
  colors: { accent },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: {
      defaultProps: { radius: 'md' },
    },
    NumberInput: {
      defaultProps: { hideControls: true },
    },
  },
});
