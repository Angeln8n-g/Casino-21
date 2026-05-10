import React, { useState, useEffect } from 'react';

// Google AdSense Placeholders
const AD_CLIENT = 'ca-pub-XXXX';
const AD_SLOT_INTERSTITIAL = '1111';
const AD_SLOT_REWARDED = '2222';
const AD_SLOT_GATE = '3333';
const AD_COOLDOWN_MS = 60000; // 60 seconds cooldown

// Global reference to the internal state setter for imperative API calls
let setAdStateGlobal: React.Dispatch<React.SetStateAction<AdState>> | null = null;
let lastAdShownTime = 0;

/**
 * Types of ads we can display via our modal
 */
type AdType = 'interstitial' | 'rewarded' | 'gate' | null;

interface AdState {
  isVisible: boolean;
  type: AdType;
  onReward?: (amount: number) => void;
  rewardAmount?: number;
  onClose?: () => void;
}

interface AdManagerProps {
  onAdEvent?: (event: string, data: any) => void;
}

/**
 * Initializes the Google AdSense script. 
 * Prevents multiple loads and gracefully handles script injection.
 */
export const initializeAds = (): void => {
  if (typeof window === 'undefined') return;

  // Prevent multiple loads
  if (document.getElementById('adsense-script')) {
    return;
  }

  try {
    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // Handle ad blockers gracefully by catching script load errors
    script.onerror = () => {
      console.warn('AdSense script failed to load. An ad blocker might be active.');
    };

    document.head.appendChild(script);
  } catch (error) {
    console.error('Error initializing AdSense:', error);
  }
};

/**
 * Helper to check if the ad cooldown period has passed.
 */
const isCooldownActive = (): boolean => {
  const now = Date.now();
  if (now - lastAdShownTime < AD_COOLDOWN_MS) {
    console.log('Ad is on cooldown. Please wait.');
    return true;
  }
  return false;
};

/**
 * Shows an Interstitial Ad during a game pause.
 * Auto-closes after 5 seconds or when the user clicks "Close".
 */
export const showInterstitialAd = (): void => {
  if (isCooldownActive() || !setAdStateGlobal) return;
  lastAdShownTime = Date.now();
  setAdStateGlobal({ isVisible: true, type: 'interstitial' });
};

/**
 * Simulates a Rewarded Ad using "Matched Content" or "Multiplex" units.
 * Executes the callback with the rewardAmount after a 15-second simulation delay.
 * 
 * @param onReward - Callback function executed when the time finishes.
 * @param rewardAmount - The amount to pass to the callback (defaults to 500).
 */
export const showRewardedAd = (onReward: (amount: number) => void, rewardAmount: number = 500): void => {
  if (isCooldownActive() || !setAdStateGlobal) {
    // If ad is blocked or on cooldown, skip it to not interrupt user flow
    // Fallback: reward user directly if ad doesn't show
    onReward(rewardAmount);
    return;
  }
  lastAdShownTime = Date.now();
  setAdStateGlobal({ isVisible: true, type: 'rewarded', onReward, rewardAmount });
};

/**
 * Shows a Gate Ad to unlock features (like 10 bot games).
 * Similar to interstitial but requires explicit close to proceed.
 */
export const showGateAdForBots = (onClose: () => void): void => {
  if (isCooldownActive() || !setAdStateGlobal) {
    // If cooldown is active, let them pass immediately to not block gameplay
    onClose();
    return;
  }
  lastAdShownTime = Date.now();
  setAdStateGlobal({ isVisible: true, type: 'gate', onClose });
};

/**
 * AdManager Component
 * Needs to be mounted at the root of the app to render the ad modals.
 */
export const AdManager: React.FC<AdManagerProps> = ({ onAdEvent }) => {
  const [adState, setAdState] = useState<AdState>({
    isVisible: false,
    type: null,
  });

  // Bind the global setter to the component's state
  useEffect(() => {
    setAdStateGlobal = setAdState;
    return () => {
      setAdStateGlobal = null;
    };
  }, []);

  // Tracking: Ad Impression
  useEffect(() => {
    if (adState.isVisible && adState.type) {
      console.log('ad_impression', { adType: adState.type, timestamp: Date.now() });
      if (onAdEvent) {
        onAdEvent('ad_impression', { adType: adState.type, timestamp: Date.now() });
      }
    }
  }, [adState.isVisible, adState.type, onAdEvent]);

  // UX Improvement: 3s delay before allowing close for gate/interstitial
  const [canClose, setCanClose] = useState(false);
  useEffect(() => {
    if (adState.isVisible && adState.type !== 'rewarded') {
      setCanClose(false);
      const timer = setTimeout(() => {
        setCanClose(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [adState.isVisible, adState.type]);

  // Handle Interstitial Auto-close
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (adState.isVisible && adState.type === 'interstitial') {
      timer = setTimeout(() => {
        closeAd();
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [adState.isVisible, adState.type]);

  // Handle Rewarded Ad Simulation (15 seconds)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (adState.isVisible && adState.type === 'rewarded') {
      timer = setTimeout(() => {
        if (adState.onReward) {
          const amount = adState.rewardAmount || 500;
          adState.onReward(amount);
          console.log('ad_reward_earned', { adType: adState.type, amount, timestamp: Date.now() });
          if (onAdEvent) {
            onAdEvent('ad_reward_earned', { adType: adState.type, amount, timestamp: Date.now() });
          }
        }
        closeAd();
      }, 15000);
    }
    return () => clearTimeout(timer);
  }, [adState.isVisible, adState.type, adState.rewardAmount, adState.onReward, onAdEvent]);

  // Load the actual AdSense ad block when the modal becomes visible
  useEffect(() => {
    if (adState.isVisible) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn('AdSense push failed, possibly blocked:', e);
      }
    }
  }, [adState.isVisible]);

  const closeAd = () => {
    console.log('ad_closed', { adType: adState.type, timestamp: Date.now() });
    if (onAdEvent) {
      onAdEvent('ad_closed', { adType: adState.type, timestamp: Date.now() });
    }

    if (adState.type === 'gate' && adState.onClose) {
      adState.onClose();
    }
    setAdState({ isVisible: false, type: null });
  };

  if (!adState.isVisible) return null;

  // Determine correct AdSlot
  let currentAdSlot = AD_SLOT_INTERSTITIAL;
  if (adState.type === 'rewarded') {
    currentAdSlot = AD_SLOT_REWARDED;
  } else if (adState.type === 'gate') {
    currentAdSlot = AD_SLOT_GATE;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Sponsored Message</h2>
        
        {/* AdSense Unit */}
        <div style={styles.adContainer}>
          <ins
            key={adState.type} // force re-render for different slots
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={AD_CLIENT}
            data-ad-slot={currentAdSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        {adState.type !== 'rewarded' && (
          <button 
            style={{ ...styles.closeButton, opacity: canClose ? 1 : 0.5 }} 
            onClick={closeAd}
            disabled={!canClose}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: '#1f2937', // dark mode like tailwind slate-800
    padding: '24px',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    textAlign: 'center' as const,
    color: '#f3f4f6', // gray-100
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
    border: '1px solid #374151',
  },
  adContainer: {
    width: '100%',
    height: '250px',
    backgroundColor: '#374151',
    margin: '24px 0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  closeButton: {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#3b82f6', // blue-500
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
