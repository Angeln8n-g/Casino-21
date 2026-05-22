export type AdConsent = 'accepted' | 'rejected' | 'unknown';

export interface AdProvider {
  init(consent: AdConsent): void;
  showInterstitial(container: HTMLElement): Promise<void>;
  showRewarded(container: HTMLElement): Promise<void>;
  loadSocialBar(): void;
  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void;
}

const SMARTLINK_URL = 'https://www.effectivecpmnetwork.com/pjrzb7h0u?key=32f0910372f172128b893744e76b2906';
const SOCIAL_BAR_SRC = 'https://pl29515854.effectivecpmnetwork.com/db/ef/6d/dbef6d6530a7ac6860c1927ddf4bf786.js';
const NATIVE_SCRIPT_SRC = 'https://pl29517528.effectivecpmnetwork.com/375b4de8af761de82a87505e0e700983/invoke.js';
const NATIVE_CONTAINER_ID = 'container-375b4de8af761de82a87505e0e700983';

function createAdIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  iframe.title = 'Anuncio patrocinado';
  return iframe;
}

export class AdsterraProvider implements AdProvider {
  private initialized = false;
  private consent: AdConsent = 'unknown';

  init(consent: AdConsent): void {
    if (this.initialized) return;
    this.consent = consent;
    if (consent !== 'accepted') return;
    this.initialized = true;
  }

  async showInterstitial(container: HTMLElement): Promise<void> {
    container.appendChild(createAdIframe(SMARTLINK_URL));
  }

  async showRewarded(container: HTMLElement): Promise<void> {
    container.appendChild(createAdIframe(SMARTLINK_URL));
  }

  loadSocialBar(): void {
    const script = document.createElement('script');
    script.src = SOCIAL_BAR_SRC;
    script.async = true;
    script.dataset.cfasync = 'false';
    document.body.appendChild(script);
  }

  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void {
    if (format === 'native') {
      const wrapper = document.createElement('div');
      wrapper.id = NATIVE_CONTAINER_ID;
      container.appendChild(wrapper);
      const script = document.createElement('script');
      script.src = NATIVE_SCRIPT_SRC;
      script.async = true;
      script.dataset.cfasync = 'false';
      container.appendChild(script);
    } else {
      const iframe = createAdIframe(SMARTLINK_URL);
      iframe.style.width = '300px';
      iframe.style.height = '250px';
      container.appendChild(iframe);
    }
  }
}

export const adsterraProvider: AdProvider = new AdsterraProvider();
