import { useEffect } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

export function useLandingAds(isAuthenticated: boolean): void {
  useEffect(() => {
    if (isAuthenticated) return;

    const consent = getCookieConsent();
    if (!consent?.accepted) return;

    const init = async () => {
      const { initializeAds } = await import('../../web/components/AdManager');
      initializeAds();
    };
    init();
  }, [isAuthenticated]);
}
