import { ScrollArea, UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { categoryColors } from '@/data/icons.registry';
import classes from './ColorPicker.module.css';

type Props = {
  value: string;
  onChange: (color: string) => void;
  options?: string[];
};

export function ColorPicker({ value, onChange, options = categoryColors }: Props) {
  return (
    <ScrollArea type="never" offsetScrollbars={false}>
      <div className={classes.row}>
        {options.map((color) => {
          const active = color === value;
          return (
            <UnstyledButton
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={classes.swatch}
              style={{ background: color, outlineColor: active ? color : 'transparent' }}
              aria-label={`Color ${color}`}
              aria-pressed={active}
            >
              {active && <IconCheck size={18} color="white" stroke={3} />}
            </UnstyledButton>
          );
        })}
      </div>
    </ScrollArea>
  );
}
