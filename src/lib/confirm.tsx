import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';

/**
 * Open a confirm-delete modal. Replaces native `window.confirm` everywhere.
 *
 * Usage:
 *   confirmDelete({
 *     message: 'Sigur vrei să ștergi această cheltuială?',
 *     onConfirm: async () => del.mutateAsync(id),
 *   });
 */
export function confirmDelete(opts: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  modals.openConfirmModal({
    title: opts.title ?? 'Confirmă ștergerea',
    centered: true,
    children: <Text size="sm">{opts.message}</Text>,
    labels: {
      confirm: opts.confirmLabel ?? 'Șterge',
      cancel: opts.cancelLabel ?? 'Anulează',
    },
    confirmProps: { color: 'red' },
    onConfirm: opts.onConfirm,
  });
}
