import React, { useEffect, useRef, useState } from 'react';
import { getCookieConsent } from './CookieConsent';
import { useAdConfig } from '../hooks/useAdConfigs';

export default function AdBanner() {
  const config = useAdConfig('banner');
  const containerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('cookie_consent_changed', handler);
    return () => window.removeEventListener('cookie_consent_changed', handler);
  }, []);

  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;
    if (!containerRef.current) return;
    if (!config?.script_url) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = config.script_url;
    script.async = true;
    script.dataset.cfasync = 'false';
    containerRef.current.appendChild(script);
  }, [consent?.accepted, tick, config]);

  if (!config) return null;

  return (
    <div className="flex justify-center my-8 z-10 relative">
      <div
        ref={containerRef}
        id={config.container_id || 'ad-banner-container'}
        className="w-full max-w-[300px] min-h-[250px] bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-center overflow-hidden"
      />
    </div>
  );
}
