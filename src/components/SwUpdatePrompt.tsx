import { useEffect, useState } from 'react';
import { Button, Group, Notification, Portal } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Prompts the user to refresh when a new service worker is available.
 * Only renders in production (no-op when SW isn't registered).
 */
export function SwUpdatePrompt() {
  const [show, setShow] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Periodic check for updates (every 30 min while app is open)
      if (reg) setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (needRefresh) setShow(true);
  }, [needRefresh]);

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
          onClose={() => setShow(false)}
        >
          <Group mt={6}>
            <Button size="xs" onClick={() => updateServiceWorker(true)}>
              Reîncarcă
            </Button>
            <Button size="xs" variant="subtle" onClick={() => setShow(false)}>
              Mai târziu
            </Button>
          </Group>
        </Notification>
      </div>
    </Portal>
  );
}
