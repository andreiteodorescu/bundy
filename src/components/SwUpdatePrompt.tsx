import { useEffect, useState } from 'react';
import { Button, Group, Notification, Portal } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const DISMISS_KEY = 'bundy.sw.dismissedAt';
const DISMISS_COOLDOWN_MS = 60 * 60 * 1000; // don't re-prompt for 1h after dismiss
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // check for new SW every 30 min

/**
 * Shows a "new version available" toast when the service worker detects an updated
 * deployment. User can refresh now or dismiss for ~1h.
 *
 * Why the cooldown: vite-plugin-pwa's needRefresh flag stays true even after we hide the
 * UI, so without a cooldown the prompt would re-appear on every component re-render or
 * background SW check.
 */
export function SwUpdatePrompt() {
  const [show, setShow] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Clear any prior interval to avoid accumulation if onRegisteredSW fires more than once
      const w = window as unknown as { __bundySwInterval?: number };
      if (w.__bundySwInterval) clearInterval(w.__bundySwInterval);
      w.__bundySwInterval = window.setInterval(() => {
        reg.update().catch(() => {
          /* network may be offline; will retry next tick */
        });
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  // When the lib reports a new version, show the prompt — unless we recently dismissed.
  useEffect(() => {
    if (!needRefresh) return;
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;
    setShow(true);
  }, [needRefresh]);

  function dismiss() {
    setShow(false);
    setNeedRefresh(false);
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  function reload() {
    // updateServiceWorker(true) triggers SKIP_WAITING then reloads the page.
    // No need to clear cooldown — after reload, needRefresh starts false again.
    window.localStorage.removeItem(DISMISS_KEY);
    updateServiceWorker(true);
  }

  if (!show) return null;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)',
          left: 16,
          right: 16,
          zIndex: 200,
        }}
      >
        <Notification
          color="accent"
          icon={<IconRefresh size={18} />}
          title="O versiune nouă e disponibilă"
          onClose={dismiss}
        >
          <Group mt={6}>
            <Button size="xs" onClick={reload}>
              Reîncarcă
            </Button>
            <Button size="xs" variant="subtle" onClick={dismiss}>
              Mai târziu
            </Button>
          </Group>
        </Notification>
      </div>
    </Portal>
  );
}
