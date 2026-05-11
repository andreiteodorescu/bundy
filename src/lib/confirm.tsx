import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';
import i18n from '@/i18n';

/**
 * Open a confirm-delete modal. Replaces native `window.confirm` everywhere.
 *
 * Defaults to localized strings via the global i18n instance, so callers
 * outside of React components don't need to pass a `t` function.
 */
export function confirmDelete(opts: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  modals.openConfirmModal({
    title: opts.title ?? i18n.t('confirm.title'),
    centered: true,
    children: <Text size="sm">{opts.message}</Text>,
    labels: {
      confirm: opts.confirmLabel ?? i18n.t('confirm.delete'),
      cancel: opts.cancelLabel ?? i18n.t('confirm.cancel'),
    },
    confirmProps: { color: 'red' },
    onConfirm: opts.onConfirm,
  });
}
