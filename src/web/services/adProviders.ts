export type AdConsent = 'accepted' | 'rejected' | 'unknown'

export interface AdProvider {
  init(consent: AdConsent): void
  showInterstitial(container: HTMLElement): Promise<void>
  showRewarded(container: HTMLElement): Promise<void>
  loadSocialBar(): void
  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void
}

export class AdsterraProvider implements AdProvider {
  private initialized = false
  private consent: AdConsent = 'unknown'

  init(consent: AdConsent): void {
    if (this.initialized) return
    this.consent = consent

    if (consent !== 'accepted') return

    const script = document.createElement('script')
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_ADSTERRA_ZONE_ID&cb=${Date.now()}`
    script.async = true
    document.head.appendChild(script)

    this.initialized = true
  }

  async showInterstitial(container: HTMLElement): Promise<void> {
    container.innerHTML = `
      <script type="text/javascript">
        new Image().src = 'https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_INTERSTITIAL_ZONE_ID&cb=' + Date.now();
      </script>
      <div id="adsterra-interstitial">
      </div>
    `
    return Promise.resolve()
  }

  async showRewarded(container: HTMLElement): Promise<void> {
    container.innerHTML = `
      <div id="adsterra-rewarded">
        <script type="text/javascript" src="https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_REWARDED_ZONE_ID"></script>
      </div>
    `
    return Promise.resolve()
  }

  loadSocialBar(): void {
    const script = document.createElement('script')
    script.src = `https://adsterra.com/www/delivery/asyncjs.php?zoneid=YOUR_SOCIAL_BAR_ZONE_ID`
    script.async = true
    document.body.appendChild(script)
  }

  loadBanner(container: HTMLElement, format: 'banner' | 'native'): void {
    const zoneId = format === 'banner'
      ? 'YOUR_BANNER_ZONE_ID'
      : 'YOUR_NATIVE_ZONE_ID'
    container.innerHTML = `
      <script type="text/javascript" src="https://adsterra.com/www/delivery/asyncjs.php?zoneid=${zoneId}"></script>
    `
  }
}

export const adsterraProvider: AdProvider = new AdsterraProvider()
