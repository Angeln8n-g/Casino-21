import React, { useEffect, useState } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';
import { trackAdEvent } from '../../web/services/analytics';
import { useAdConfig } from '../../web/hooks/useAdConfigs';

export default function SocialBar() {
  const config = useAdConfig('social_bar');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('cookie_consent_changed', handler);
    return () => window.removeEventListener('cookie_consent_changed', handler);
  }, []);

  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;
    if (!config?.script_url) return;

    const script = document.createElement('script');
    script.src = config.script_url;
    script.async = true;
    script.dataset.cfasync = 'false';
    document.body.appendChild(script);

    const timeout = setTimeout(() => {
      trackAdEvent('ad_social_bar_impression', 0.001);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [consent?.accepted, tick, config]);

  if (!config) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      aria-hidden="true"
    />
  );
}
