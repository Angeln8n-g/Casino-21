import { useEffect } from 'react';
import { getCookieConsent } from '../../web/components/CookieConsent';

export function useLandingAds(isAuthenticated: boolean): void {
  useEffect(() => {
    if (isAuthenticated) return;

    const tryInit = async () => {
      const { initializeAds } = await import('../../web/components/AdManager');
      initializeAds();
    };
    tryInit();

    const handleConsentChange = async () => {
      const { reinitializeAds } = await import('../../web/components/AdManager');
      reinitializeAds();
    };
    window.addEventListener('cookie_consent_changed', handleConsentChange);
    return () => window.removeEventListener('cookie_consent_changed', handleConsentChange);
  }, [isAuthenticated]);
}
