declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type AdEventName =
  | 'ad_interstitial_shown'
  | 'ad_rewarded_shown'
  | 'ad_rewarded_claimed'
  | 'ad_gate_shown'
  | 'ad_blocker_detected'
  | 'ad_social_bar_impression';

export function trackAdEvent(
  eventName: AdEventName,
  estimatedValue?: number
): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        value: estimatedValue,
        currency: 'USD',
        send_to: 'G-JQE3R8SW8H',
      });
    }
  } catch {
    // GA4 no disponible
  }
}

export function trackPageView(path: string): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path,
        send_to: 'G-JQE3R8SW8H',
      });
    }
  } catch {
    // GA4 no disponible
  }
}
