import React, { useEffect, useRef } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';
import { trackAdEvent } from '../../web/services/analytics';

export default function SocialBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_SOCIAL_BAR_ZONE_ID`;
    script.async = true;
    script.dataset.cfasync = 'false';
    containerRef.current.appendChild(script);

    const timeout = setTimeout(() => {
      trackAdEvent('ad_social_bar_impression', 0.001);
    }, 2000);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      clearTimeout(timeout);
    };
  }, [consent?.accepted]);

  return (
    <div
      ref={containerRef}
      className="hidden md:block fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      aria-hidden="true"
    />
  );
}
