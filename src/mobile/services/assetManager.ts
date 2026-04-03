import { persistenceService } from './persistenceService';

export type SoundEffect = 'placeCard' | 'takeCards' | 'roundComplete';

export interface AssetManager {
  preloadAssets(): Promise<void>;
  playSound(effect: SoundEffect): Promise<void>;
}

// Placeholder paths for card sprites — actual assets may not exist yet
const CARD_SPRITE_PATHS: number[] = [];

// Sound file mappings (placeholder requires — actual files may not exist yet)
const SOUND_MODULES: Record<SoundEffect, unknown> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  placeCard: null,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  takeCards: null,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  roundComplete: null,
};

class AssetManagerImpl implements AssetManager {
  private soundObjects: Partial<Record<SoundEffect, unknown>> = {};

  /**
   * Preload card sprites with expo-asset and load custom fonts with expo-font.
   * Called during splash screen to avoid flickering during gameplay.
   */
  async preloadAssets(): Promise<void> {
    await Promise.all([
      this._preloadSprites(),
      this._loadFonts(),
    ]);
  }

  /**
   * Play a sound effect, respecting the user's soundEnabled preference.
   * Silently skips if expo-av fails or sound is disabled.
   */
  async playSound(effect: SoundEffect): Promise<void> {
    try {
      const prefs = await persistenceService.getPreferences();
      if (!prefs.soundEnabled) return;

      await this._playSoundEffect(effect);
    } catch {
      // Silently skip any errors
    }
  }

  private async _preloadSprites(): Promise<void> {
    if (CARD_SPRITE_PATHS.length === 0) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Asset } = require('expo-asset');
      await Asset.loadAsync(CARD_SPRITE_PATHS);
    } catch {
      // expo-asset unavailable or assets missing — skip silently
    }
  }

  private async _loadFonts(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Font = require('expo-font');
      // Load custom fonts if any are defined; currently a no-op placeholder
      const fontMap: Record<string, unknown> = {};
      if (Object.keys(fontMap).length > 0) {
        await Font.loadAsync(fontMap);
      }
    } catch {
      // expo-font unavailable — skip silently
    }
  }

  private async _playSoundEffect(effect: SoundEffect): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Audio } = require('expo-av');

      const module_ = SOUND_MODULES[effect];
      if (!module_) return; // No asset defined yet — skip silently

      // Reuse cached sound object if available
      let sound = this.soundObjects[effect];
      if (!sound) {
        const { sound: loaded } = await Audio.Sound.createAsync(module_);
        sound = loaded;
        this.soundObjects[effect] = sound;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sound as any).replayAsync();
    } catch {
      // expo-av failed to load or play — skip silently
    }
  }
}

export const assetManager: AssetManager = new AssetManagerImpl();
