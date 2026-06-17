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
  imageUrl?: string | null,
  onClick?: () => void
): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col items-center justify-center gap-4 w-full h-full';

  // Fallback to the default promo banner if no image is configured
  const finalImageUrl = imageUrl || '/ad_promo_banner.png';

  if (finalImageUrl) {
    // Render the ad image as a clickable link/banner
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.className = 'w-full max-w-[340px] aspect-[4/3] rounded-xl overflow-hidden border border-white/10 hover:border-yellow-500/40 shadow-xl hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-all duration-300 transform hover:scale-[1.02] cursor-pointer block relative group';
    link.addEventListener('click', () => {
      if (onClick) onClick();
    });

    const img = document.createElement('img');
    img.src = finalImageUrl;
    img.alt = 'Anuncio Patrocinado';
    img.className = 'w-full h-full object-cover';
    
    // Graceful error fallback: if image fails to load, fallback to default button and text display
    img.addEventListener('error', () => {
      container.innerHTML = '';
      
      const fallbackWrapper = document.createElement('div');
      fallbackWrapper.className = 'flex flex-col items-center justify-center gap-4 w-full h-full';
      
      const p = document.createElement('p');
      p.className = 'text-gray-300 text-sm text-center px-4';
      p.textContent = label;
      fallbackWrapper.appendChild(p);

      const btn = document.createElement('button');
      btn.className =
        'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-8 py-3 rounded-xl font-black text-sm transition transform hover:scale-105 shadow-lg cursor-pointer';
      btn.textContent = 'Ver anuncio';
      btn.addEventListener('click', () => {
        window.open(url, '_blank');
        if (onClick) onClick();
      });
      fallbackWrapper.appendChild(btn);
      container.appendChild(fallbackWrapper);
    });
    
    link.appendChild(img);

    // Hover overlay effect
    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-300';
    overlay.innerHTML = '<span class="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">Visitar Anuncio</span>';
    link.appendChild(overlay);

    wrapper.appendChild(link);

    const caption = document.createElement('p');
    caption.className = 'text-gray-400 text-xs text-center px-4 italic';
    caption.textContent = 'Haz clic en la imagen para ver el anuncio';
    wrapper.appendChild(caption);
  } else {
    // Fallback: standard button if no image is configured
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
  }

  container.appendChild(wrapper);
}

async function getAdDetails(adType: 'interstitial' | 'rewarded'): Promise<{ smartlink_url: string | null; image_url: string | null } | null> {
  try {
    const { data } = await supabase
      .from('ad_configurations')
      .select('smartlink_url, image_url')
      .eq('ad_type', adType)
      .eq('enabled', true)
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    return data || null;
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
    const details = await getAdDetails('interstitial');
    if (details?.smartlink_url) {
      createAdCta(container, 'Gracias por apoyar el juego. Haz clic para ver el anuncio.', details.smartlink_url, details.image_url, onClick);
    }
  }

  async showRewarded(container: HTMLElement, onClick?: () => void): Promise<void> {
    const details = await getAdDetails('rewarded');
    if (details?.smartlink_url) {
      createAdCta(container, 'Haz clic para ver el anuncio y recibir tu recompensa.', details.smartlink_url, details.image_url, onClick);
    }
  }
}

export const adProvider: AdProvider = new DynamicAdProvider();
