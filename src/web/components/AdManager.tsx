import React, { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { adProvider, AdConsent } from '../services/adProviders';
import { getCookieConsent } from './CookieConsent';
import { trackAdEvent } from '../services/analytics';
import { logAdEventToDb } from '../services/adLogger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdState {
  isLoaded: boolean;
  lastAdAt: number;
  isAdBlocked: boolean;
}

interface AdModalProps {
  onClose: () => void;
  renderAd: (container: HTMLDivElement) => Promise<void>;
  minWaitMs: number;
  title?: string;
  subtitle?: string;
  waitMsg: string;
  closeLabel: string;
  showCountdown?: boolean;
  adType: 'interstitial' | 'rewarded';
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COOLDOWN_MS = 60_000;
const REWARD_WAIT_MS = 15_000;
const INTERSTITIAL_WAIT_MS = 5_000;
const BOT_GAMES = 10;

const BOT_STORAGE_KEY = 'casino21_botGamesRemaining';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const state: AdState = {
  isLoaded: false,
  lastAdAt: 0,
  isAdBlocked: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the 60s global cooldown has elapsed since the last ad
 * was shown. Shared across all ad types.
 */
function cooldownOk(): boolean {
  return Date.now() - state.lastAdAt >= COOLDOWN_MS;
}

/**
 * Records the current timestamp so that subsequent ads are gated by the
 * global 60s cooldown window.
 */
function markShown(): void {
  state.lastAdAt = Date.now();
}

// ---------------------------------------------------------------------------
// Internal Modal Component — imperatively rendered via createRoot
// ---------------------------------------------------------------------------

const AdModal: React.FC<AdModalProps> = ({
  onClose,
  renderAd,
  minWaitMs,
  title,
  subtitle,
  waitMsg,
  closeLabel,
  showCountdown,
  adType,
}) => {
  const [canClose, setCanClose] = useState(false);
  const [seconds, setSeconds] = useState(Math.ceil(minWaitMs / 1000));
  const [blocked, setBlocked] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let detectTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const initTimer = setTimeout(async () => {
      if (adRef.current && mounted) {
        await renderAd(adRef.current);
      }
      detectTimer = setTimeout(() => {
        if (adRef.current && adRef.current.offsetHeight === 0 && mounted) {
          setBlocked(true);
          state.isAdBlocked = true;
          trackAdEvent('ad_blocker_detected');
          logAdEventToDb(adType, 'blocked');
        }
      }, 1500);
    }, 50);

    const closeTimer = setTimeout(() => { if (mounted) setCanClose(true); }, minWaitMs);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(detectTimer);
      clearTimeout(closeTimer);
      mounted = false;
    };
  }, [minWaitMs, renderAd]);

  useEffect(() => {
    if (!showCountdown || seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [showCountdown, seconds]);

  const progressPct =
    showCountdown
      ? ((minWaitMs / 1000 - seconds) / (minWaitMs / 1000)) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop — absorbs clicks to prevent interaction with game behind it */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-[#0f172a] rounded-2xl border border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)] overflow-hidden">
        {/* Header */}
        {title && (
          <div className="px-6 py-4 bg-gradient-to-r from-yellow-900/30 to-black/20 border-b border-yellow-500/20">
            <h2 className="text-xl font-black text-yellow-400 tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
        )}

        {/* Ad unit or ad-blocker fallback */}
        <div className="p-4 min-h-[200px] flex items-center justify-center">
          {blocked ? (
            <div className="text-center py-6">
              <p className="text-gray-300 font-semibold text-sm">
                Parece que tienes un bloqueador de anuncios.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Desactívalo para apoyar el juego.
              </p>
            </div>
          ) : (
            <div ref={adRef} className="w-full flex justify-center h-[300px]" />
          )}
        </div>

        {/* Footer — countdown bar or close button */}
        <div className="px-6 py-4 border-t border-white/10">
          {canClose ? (
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-6 py-3 rounded-xl font-black text-sm transition transform hover:scale-105 shadow-lg"
            >
              {closeLabel}
            </button>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                {waitMsg}
                {showCountdown && (
                  <span className="text-yellow-400 font-bold ml-1">
                    {seconds}s
                  </span>
                )}
              </p>
              {showCountdown && (
                <div className="mt-2 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Imperative modal helper — creates a detached React root
// ---------------------------------------------------------------------------

/**
 * Appends a div to <body>, renders a React component into it via createRoot,
 * and handles cleanup (unmount + DOM removal) when the modal closes.
 */
function createModal(
  modalProps: Omit<AdModalProps, 'onClose'>,
  onDone: () => void
): void {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root: Root = createRoot(container);

  const handleClose = () => {
    root.unmount();
    container.remove();
    markShown();
    onDone();
  };

  root.render(<AdModal {...modalProps} onClose={handleClose} />);
}

// ---------------------------------------------------------------------------
// Public API — matching the stub signatures consumers already depend on
// ---------------------------------------------------------------------------

/**
 * Marks the ad pipeline as initialised.
 *
 * Reads config from the database dynamically. Safe to call multiple
 * times — subsequent invocations are no-ops. If consent is 'unknown'
 * (user hasn't decided yet), does NOT mark as loaded so a later
 * reinitialization can pick up their decision.
 */
export const initializeAds = (): void => {
  if (!state.isLoaded) {
    const consentData = getCookieConsent();
    const consent: AdConsent = !consentData ? 'unknown'
      : consentData.accepted ? 'accepted' : 'rejected';
    adProvider.init(consent);
    if (consent !== 'unknown') {
      state.isLoaded = true;
    }
  }
};

/**
 * Forgets the previous initialization result so the next call to
 * initializeAds() will re-evaluate consent and re-init the provider.
 * Used when the user changes their cookie consent decision.
 */
export const reinitializeAds = (): void => {
  state.isLoaded = false;
  adProvider.reset();
  initializeAds();
};

/**
 * Shows a full-screen interstitial-style ad modal.
 *
 * Displays an interstitial in a centred card overlay. The "Continue"
 * button becomes clickable after 5 seconds. Enforces the global 60s cooldown.
 *
 * Consumers:
 *  - MatchPointHUD      (score >= 17, every score update)
 *  - MatchCompletedScreen (on mount)
 *  - MatchAbandonedScreen (on mount)
 */
export const showInterstitialAd = (): void => {
  if (!state.isLoaded || state.isAdBlocked || !cooldownOk()) return;
  trackAdEvent('ad_interstitial_shown', 0.01);
  logAdEventToDb('interstitial', 'impression');

  createModal(
    {
      renderAd: (container) =>
        adProvider.showInterstitial(container, () => {
          logAdEventToDb('interstitial', 'click');
        }),
      minWaitMs: INTERSTITIAL_WAIT_MS,
      title: 'KASINO21',
      subtitle: 'Gracias por apoyar el juego',
      waitMsg: 'La publicidad nos ayuda a mantener el juego gratis...',
      closeLabel: 'Continuar',
      adType: 'interstitial',
    },
    () => {
      logAdEventToDb('interstitial', 'complete');
    }
  );
};

/**
 * Shows a rewarded ad modal. The user must wait 15 seconds before they can
 * close the ad and receive the reward.
 *
 * On close, invokes `onReward(rewardAmount)`. Default reward is 500 coins.
 * If the ad pipeline isn't ready or an ad blocker is active the reward is
 * granted immediately (graceful fallback). Enforces the 60s cooldown.
 *
 * Consumer:
 *  - Store (view sponsored message button)
 *
 * @param onReward  Called with the coin amount when the user closes the ad.
 * @param rewardAmount  Coins awarded (default 500).
 */
export const showRewardedAd = (
  onReward: (amount: number) => void,
  rewardAmount: number = 500
): void => {
  if (!state.isLoaded || state.isAdBlocked || !cooldownOk()) {
    onReward(rewardAmount);
    return;
  }
  trackAdEvent('ad_rewarded_shown', 0.02);
  logAdEventToDb('rewarded', 'impression');

  createModal(
    {
      renderAd: (container) =>
        adProvider.showRewarded(container, () => {
          logAdEventToDb('rewarded', 'click');
        }),
      minWaitMs: REWARD_WAIT_MS,
      title: 'Mensaje Patrocinado',
      subtitle: `Mira el anuncio para ganar ${rewardAmount} monedas`,
      waitMsg: 'Recompensa disponible en',
      closeLabel: `Reclamar +${rewardAmount} monedas`,
      showCountdown: true,
      adType: 'rewarded',
    },
    () => {
      trackAdEvent('ad_rewarded_claimed', 0.03);
      logAdEventToDb('rewarded', 'complete', { rewardAmount });
      onReward(rewardAmount);
    }
  );
};

/**
 * Shows a gate ad modal to unlock 10 bot games.
 *
 * If the user already has remaining bot games from a previous gate
 * (stored in sessionStorage), the callback fires immediately — no ad shown.
 * Otherwise, displays the interstitial-style modal and stores the unlock
 * count on close. Enforces the 60s cooldown.
 *
 * Each call to this function decrements the counter by 1. When it reaches 0
 * the gate ad is shown again to re-stock.
 *
 * Consumer:
 *  - MainMenu (handlePlayVsBot)
 *
 * @param onClose  Invoked after the ad closes (or immediately if games remain).
 */
export const showGateAdForBots = (onClose: () => void): void => {
  const remaining = parseInt(
    sessionStorage.getItem(BOT_STORAGE_KEY) || '0',
    10
  );

  if (remaining > 0) {
    sessionStorage.setItem(BOT_STORAGE_KEY, String(remaining - 1));
    onClose();
    return;
  }

  if (!state.isLoaded || state.isAdBlocked || !cooldownOk()) {
    onClose();
    return;
  }
  trackAdEvent('ad_gate_shown', 0.01);
  logAdEventToDb('interstitial', 'impression', { context: 'gate_bots' });

  createModal(
    {
      renderAd: (container) =>
        adProvider.showInterstitial(container, () => {
          logAdEventToDb('interstitial', 'click', { context: 'gate_bots' });
        }),
      minWaitMs: INTERSTITIAL_WAIT_MS,
      title: 'Jugar contra el Bot',
      subtitle: `Mira el anuncio para desbloquear ${BOT_GAMES} partidas`,
      waitMsg: 'Desbloqueando partidas contra bots...',
      closeLabel: 'Jugar vs Bot',
      adType: 'interstitial',
    },
    () => {
      sessionStorage.setItem(BOT_STORAGE_KEY, String(BOT_GAMES - 1));
      logAdEventToDb('interstitial', 'complete', { context: 'gate_bots' });
      onClose();
    }
  );
};

/**
 * AdManager React component — kept for backward compatibility.
 *
 * All ad functionality is handled by the imperative functions above.
 * This component renders nothing; it exists only to maintain the existing
 * export surface and serve as a future mounting point for inline banners
 * if needed.
 */
export const AdManager: React.FC = () => null;
