import React, { useEffect, useRef } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

const NATIVE_SCRIPTS_LOADED_KEY = 'casino21_native_banner_loaded';
const NATIVE_SCRIPT_SRC = 'https://pl29517528.effectivecpmnetwork.com/375b4de8af761de82a87505e0e700983/invoke.js';
const NATIVE_CONTAINER_ID = 'container-375b4de8af761de82a87505e0e700983';

export default function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const consent = getCookieConsent();

  useEffect(() => {
    if (!consent?.accepted) return;

    if (!sessionStorage.getItem(NATIVE_SCRIPTS_LOADED_KEY)) {
      const script = document.createElement('script');
      script.src = NATIVE_SCRIPT_SRC;
      script.async = true;
      script.dataset.cfasync = 'false';
      document.head.appendChild(script);
      sessionStorage.setItem(NATIVE_SCRIPTS_LOADED_KEY, '1');
    }

    return () => {};
  }, [consent?.accepted]);

  return (
    <div className="flex justify-center my-8">
      <div
        ref={containerRef}
        id={NATIVE_CONTAINER_ID}
        className="w-full max-w-[300px] min-h-[250px] bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-center"
      />
    </div>
  );
}
