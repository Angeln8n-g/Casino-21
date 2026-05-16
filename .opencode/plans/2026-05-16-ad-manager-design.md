# AdManager Design

## Problem

The existing `src/web/components/AdManager.tsx` exports 4 stub functions (`initializeAds`, `showInterstitialAd`, `showRewardedAd`, `showGateAdForBots`) that all do nothing. Five consumer components import and call these functions expecting real ad behavior.

## Solution

Two-layer ad strategy:

### Layer 1: Google AdSense Auto Ads

AdSense Auto Ads script added to `index.html` `<head>`. This handles automatic anchor ads, vignettes, and page-level auto ads without any JS API calls.

### Layer 2: Custom modal functions (existing API preserved)

Three functions (`showInterstitialAd`, `showRewardedAd`, `showGateAdForBots`) use imperative `createRoot` to render React modal components with embedded AdSense display/matched-content units. Zero consumer changes needed.

## Architecture

### File: `src/web/components/AdManager.tsx`

```
AdManager.tsx (~180 lines)
├── Types
│   ├── AdConfig { clientId, slotId }
│   └── AdState { isLoaded, lastShown, isAdBlocked }
├── Constants
│   ├── COOLDOWN_MS = 60_000
│   ├── REWARD_DELAY_MS = 15_000
│   ├── INTERSTITIAL_AUTOCLOSE_MS = 5_000
│   └── BOT_GAMES_UNLOCKED = 10
├── adState (module-level state object)
├── initializeAds()
│   └── Sets adState.isLoaded = true (script is in index.html)
├── showInterstitialAd()
│   └── Cooldown check → creates div → createRoot → <InterstitialModal>
│       ├── Full-screen dark overlay, centered white card
│       ├── AdSense display ad unit (300×250 responsive)
│       ├── Auto-close after 5s via setTimeout → close button appears
│       └── On close → cleanup root + remove DOM node
├── showRewardedAd(onReward)
│   └── Cooldown check → creates div → createRoot → <RewardedModal>
│       ├── Full-screen overlay with "Matched Content" AdSense unit
│       ├── 15s countdown timer (visible to user)
│       ├── After 15s → "Claim Reward" button appears
│       └── On close → onReward(500), stores timestamp
├── showGateAdForBots(onClose)
│   └── Same pattern as interstitial → <GateModal>
│       ├── Same as interstitial modal with "Unlock Bot Games" messaging
│       ├── After close → sessionStorage.setItem('botGamesUnlocked', 10)
│       └── onClose() fires
└── AdManager (exported component — returns null, backward compat)
```

### Modal Component Details

Each modal is a React FC rendered imperatively:

```
InterstitialModal
├── Props: { onClose: () => void }
├── State: canClose (boolean, becomes true after 5s)
├── Renders:
│   ├── Fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center
│   ├── White rounded card with AdSense ad container (data-ad-slot placeholder)
│   ├── Countdown or "Continue" button based on canClose
└── On mount: setTimeout(() => setCanClose(true), 5000)
```

### Ad Blocker Handling

- After rendering ad container, check `container.offsetHeight` after 2s
- If 0 → assume blocked → show fallback message "Please disable ad blocker" + allow proceed without reward
- Store `isAdBlocked` flag to skip future modal rendering

### Cooldown Logic

- Module-level `lastAdShown: number` timestamp
- All `show*` functions check `Date.now() - lastAdShown >= 60000`
- If cooldown active → call callback immediately (skip ad)

### Consumer Files Affected

**None.** All 5 consumers keep current imports unchanged.

### `index.html` Change

Add to `<head>`:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7975398244257516" crossorigin="anonymous"></script>
```

## Data Flow

```
Consumer calls showInterstitialAd()
  → cooldown check (skip if < 60s)
  → create div, createRoot(modal)
  → modal renders with AdSense unit
  → user sees ad, timeout runs
  → user clicks Continue
  → root.unmount(), div.remove()
  → update lastAdShown
```

## SessionStorage for Bot Gates

- `showGateAdForBots` stores `botGamesUnlocked = "10"` in sessionStorage
- `MainMenu.tsx` calls `showGateAdForBots` which checks sessionStorage first
- Each bot game decrements the counter
- When counter hits 0, gate shows again

## Error Handling

| Scenario | Behavior |
|---|---|
| Ad blocker detected | Fallback message, callback fires without reward |
| Cooldown active | Callback fires immediately, no modal |
| Script not loaded | Callback fires immediately, no modal |
| Ad unit fails to render | Modal shows for minimum time, then allows close |

## Testing Strategy

- Unit tests: cooldown logic, sessionStorage read/write
- Manual: verify modals render, AdSense units appear, cooldown works
- Ad blocker: test with uBlock Origin enabled/disabled

## Future Considerations

- If Google Ad Manager (GAM) is adopted later, swap modal content for native rewarded/interstitial APIs — function signatures stay the same
- Bot gate counter could move to backend for harder enforcement
