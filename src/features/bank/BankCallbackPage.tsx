import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Center, Container, Loader, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { IconCheck, IconExclamationCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { BANK_CONNECTIONS_KEY } from './api';

/**
 * Lands here after the user finishes the bank auth flow at Salt Edge. Salt Edge
 * appends `?status=success|error|fetching` to our return_to URL, which already
 * carries our `?ref=<reference>` from /api/bank/init. We read both, post the ref
 * to /api/bank/callback, and on success redirect back to /bank.
 */
export function BankCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const seStatus = params.get('status');
      if (!ref) {
        setError(t('bank.callbackMissingRef'));
        setStatus('error');
        return;
      }
      if (seStatus === 'error' || seStatus === 'fail') {
        setError(t('bank.callbackProviderFail'));
        setStatus('error');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setError(t('bank.callbackNotAuthenticated'));
        setStatus('error');
        return;
      }

      try {
        const res = await fetch('/api/bank/callback', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference: ref }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
        notifications.show({
          message: t('bank.callbackSuccess', {
            count: body.sync_stats?.[0]?.imported ?? 0,
          }),
          color: 'green',
          autoClose: 3000,
        });
        setStatus('success');
        setTimeout(() => navigate('/bank'), 1500);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error');
        setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, qc, t]);

  return (
    <Container size="sm" py="xl">
      <Center py="xl">
        <Stack align="center" gap="md">
          {status === 'loading' && (
            <>
              <Loader />
              <Text c="dimmed">{t('bank.callbackProcessing')}</Text>
            </>
          )}
          {status === 'success' && (
            <Alert color="green" icon={<IconCheck size={20} />}>
              {t('bank.callbackSuccessShort')}
            </Alert>
          )}
          {status === 'error' && (
            <Stack align="center" gap="md">
              <Alert color="red" icon={<IconExclamationCircle size={20} />}>
                {error}
              </Alert>
              <Button onClick={() => navigate('/bank')}>{t('bank.back')}</Button>
            </Stack>
          )}
        </Stack>
      </Center>
    </Container>
  );
}
