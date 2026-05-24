import { supabase } from './supabase';

export type AdConsent = 'accepted' | 'rejected' | 'unknown';

export interface AdProvider {
  init(consent: AdConsent): void;
  showInterstitial(container: HTMLElement): Promise<void>;
  showRewarded(container: HTMLElement): Promise<void>;
  reset(): void;
}

function createAdCta(container: HTMLElement, label: string, url: string): void {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 w-full h-full">
      <p class="text-gray-300 text-sm text-center px-4">
        ${label}
      </p>
      <button onclick="window.open('${url}', '_blank')"
        class="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 py-3 rounded-xl font-black text-sm transition transform hover:scale-105 shadow-lg cursor-pointer">
        Ver anuncio
      </button>
    </div>
  `;
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

  async showInterstitial(container: HTMLElement): Promise<void> {
    const url = await getSmartlinkUrl('interstitial');
    if (url) {
      createAdCta(container, 'Gracias por apoyar el juego. Haz clic para ver el anuncio.', url);
    }
  }

  async showRewarded(container: HTMLElement): Promise<void> {
    const url = await getSmartlinkUrl('rewarded');
    if (url) {
      createAdCta(container, 'Haz clic para ver el anuncio y recibir tu recompensa.', url);
    }
  }
}

export const adProvider: AdProvider = new DynamicAdProvider();
