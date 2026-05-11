import { forwardRef, useImperativeHandle, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Center, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

export const HCAPTCHA_ENABLED = Boolean(SITE_KEY);

export type CaptchaGateRef = {
  reset: () => void;
};

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark';
};

/**
 * Wrapper around the official @hcaptcha/react-hcaptcha widget.
 *
 * Behavior:
 *   - In dev (VITE_HCAPTCHA_SITE_KEY missing) renders nothing and exposes a no-op `reset()`.
 *     Forms that import HCAPTCHA_ENABLED can skip captcha gating entirely.
 *   - In prod with site key set, renders the widget and bubbles the token via onVerify.
 *
 * Usage in a form:
 *   const captchaRef = useRef<CaptchaGateRef>(null);
 *   const [token, setToken] = useState<string | null>(null);
 *   ...
 *   <CaptchaGate ref={captchaRef} onVerify={setToken} onExpire={() => setToken(null)} />
 *   <Button disabled={HCAPTCHA_ENABLED && !token} ... />
 *   // On submit error: captchaRef.current?.reset(); setToken(null);
 */
export const CaptchaGate = forwardRef<CaptchaGateRef, Props>(function CaptchaGate(
  { onVerify, onExpire, theme = 'dark' },
  ref,
) {
  const widgetRef = useRef<HCaptcha>(null);
  const { t } = useTranslation();

  useImperativeHandle(ref, () => ({
    reset: () => widgetRef.current?.resetCaptcha(),
  }));

  if (!SITE_KEY) {
    return (
      <Text size="xs" c="dimmed" ta="center">
        {t('auth.captcha.disabled')}
      </Text>
    );
  }

  return (
    <Center>
      <HCaptcha
        ref={widgetRef}
        sitekey={SITE_KEY}
        onVerify={onVerify}
        onExpire={() => onExpire?.()}
        onError={() => onExpire?.()}
        theme={theme}
      />
    </Center>
  );
});
