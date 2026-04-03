import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  volume: number; // 0.0 - 1.0
}

export interface PersistenceService {
  saveRoomId(roomId: string): Promise<void>;
  getRoomId(): Promise<string | null>;
  clearRoomId(): Promise<void>;
  savePreferences(prefs: UserPreferences): Promise<void>;
  getPreferences(): Promise<UserPreferences>;
}

const ROOM_ID_KEY = 'casino21_roomId';
const PREFERENCES_KEY = 'casino21_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: true,
  hapticsEnabled: true,
  volume: 1.0,
};

class PersistenceServiceImpl implements PersistenceService {
  async saveRoomId(roomId: string): Promise<void> {
    await AsyncStorage.setItem(ROOM_ID_KEY, roomId);
  }

  async getRoomId(): Promise<string | null> {
    return AsyncStorage.getItem(ROOM_ID_KEY);
  }

  async clearRoomId(): Promise<void> {
    await AsyncStorage.removeItem(ROOM_ID_KEY);
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  }

  async getPreferences(): Promise<UserPreferences> {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }
}

export const persistenceService: PersistenceService = new PersistenceServiceImpl();
