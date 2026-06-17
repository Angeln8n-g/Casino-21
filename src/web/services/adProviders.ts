import { supabase } from './supabase';

export type AdConsent = 'accepted' | 'rejected' | 'unknown';

export interface AdProvider {
  init(consent: AdConsent): void;
  showInterstitial(container: HTMLElement, onClick?: () => void): Promise<void>;
  showRewarded(container: HTMLElement, onClick?: () => void): Promise<void>;
  reset(): void;
}

function createAdCta(
  container: HTMLElement,
  label: string,
  url: string,
  onClick?: () => void
): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col items-center justify-center gap-4 w-full h-full';

  const p = document.createElement('p');
  p.className = 'text-gray-300 text-sm text-center px-4';
  p.textContent = label;
  wrapper.appendChild(p);

  const btn = document.createElement('button');
  btn.className =
    'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 py-3 rounded-xl font-black text-sm transition transform hover:scale-105 shadow-lg cursor-pointer';
  btn.textContent = 'Ver anuncio';
  btn.addEventListener('click', () => {
    window.open(url, '_blank');
    if (onClick) onClick();
  });
  wrapper.appendChild(btn);

  container.appendChild(wrapper);
}

async function getSmartlinkUrl(adType: 'interstitial' | 'rewarded'): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('ad_configurations')
      .select('smartlink_url')
      .eq('ad_type', adType)
      .eq('enabled', true)
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    return data?.smartlink_url || null;
  } catch {
    return null;
  }
}

class DynamicAdProvider implements AdProvider {
  private initialized = false;

  init(consent: AdConsent): void {
    this.initialized = true;
  }

  reset(): void {
    this.initialized = false;
  }

  async showInterstitial(container: HTMLElement, onClick?: () => void): Promise<void> {
    const url = await getSmartlinkUrl('interstitial');
    if (url) {
      createAdCta(container, 'Gracias por apoyar el juego. Haz clic para ver el anuncio.', url, onClick);
    }
  }

  async showRewarded(container: HTMLElement, onClick?: () => void): Promise<void> {
    const url = await getSmartlinkUrl('rewarded');
    if (url) {
      createAdCta(container, 'Haz clic para ver el anuncio y recibir tu recompensa.', url, onClick);
    }
  }
}

export const adProvider: AdProvider = new DynamicAdProvider();
