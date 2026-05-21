import React, { useEffect, useRef } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

interface AdBannerProps {
  zoneId?: string;
}

export default function AdBanner({ zoneId = 'YOUR_NATIVE_ZONE_ID' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=${zoneId}`;
    script.async = true;
    script.dataset.cfasync = 'false';
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [zoneId, consent?.accepted]);

  return (
    <div className="flex justify-center my-8">
      <div
        ref={containerRef}
        className="w-full max-w-[300px] min-h-[250px] bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-center"
      />
    </div>
  );
}
