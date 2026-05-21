export type AdConsent = 'accepted' | 'rejected' | 'unknown';

export interface AdProvider {
  init(consent: AdConsent): void;
  showInterstitial(container: HTMLElement): Promise<void>;
  showRewarded(container: HTMLElement): Promise<void>;
  loadSocialBar(): void;
  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void;
}

function loadScript(src: string, container?: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    if (container) {
      container.appendChild(script);
    } else {
      document.body.appendChild(script);
    }
  });
}

export class AdsterraProvider implements AdProvider {
  private initialized = false;
  private consent: AdConsent = 'unknown';

  init(consent: AdConsent): void {
    if (this.initialized) return;
    this.consent = consent;

    if (consent !== 'accepted') return;

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_ADSTERRA_ZONE_ID&cb=${Date.now()}`;
    script.async = true;
    document.head.appendChild(script);

    this.initialized = true;
  }

  async showInterstitial(container: HTMLElement): Promise<void> {
    const wrapper = document.createElement('div');
    wrapper.id = 'adsterra-interstitial';
    container.appendChild(wrapper);

    const beacon = document.createElement('script');
    beacon.textContent = `
      new Image().src = 'https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_INTERSTITIAL_ZONE_ID&cb=' + Date.now();
    `;
    container.appendChild(beacon);

    return Promise.resolve();
  }

  async showRewarded(container: HTMLElement): Promise<void> {
    const wrapper = document.createElement('div');
    wrapper.id = 'adsterra-rewarded';
    container.appendChild(wrapper);

    try {
      await loadScript(
        `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_REWARDED_ZONE_ID`,
        wrapper
      );
    } catch {
      const fallback = document.createElement('p');
      fallback.className = 'text-gray-400 text-sm text-center py-4';
      fallback.textContent = 'No se pudo cargar el anuncio.';
      wrapper.appendChild(fallback);
    }
  }

  loadSocialBar(): void {
    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_SOCIAL_BAR_ZONE_ID`;
    script.async = true;
    script.dataset.cfasync = 'false';
    document.body.appendChild(script);
  }

  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void {
    const zoneId = format === 'banner'
      ? 'YOUR_BANNER_ZONE_ID'
      : 'YOUR_NATIVE_ZONE_ID';
    const wrapper = document.createElement('div');
    wrapper.id = `adsterra-${format}-${Date.now()}`;
    container.appendChild(wrapper);

    const script = document.createElement('script');
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=${zoneId}`;
    script.async = true;
    wrapper.appendChild(script);
  }
}

export const adsterraProvider: AdProvider = new AdsterraProvider();
