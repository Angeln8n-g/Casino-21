import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistenceService } from '../../services/persistenceService';

const ROOM_ID_KEY = 'casino21_roomId';

beforeEach(() => {
  jest.clearAllMocks();
  // Clear the in-memory store between tests
  (AsyncStorage as any)._store && Object.keys((AsyncStorage as any)._store).forEach((k) => {
    delete (AsyncStorage as any)._store[k];
  });
});

describe('PersistenceService - roomId', () => {
  it('saveRoomId stores the roomId under key casino21_roomId', async () => {
    await persistenceService.saveRoomId('room-abc');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ROOM_ID_KEY, 'room-abc');
  });

  it('getRoomId retrieves the stored roomId', async () => {
    await persistenceService.saveRoomId('room-xyz');

    const result = await persistenceService.getRoomId();

    expect(result).toBe('room-xyz');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(ROOM_ID_KEY);
  });

  it('getRoomId returns null when no roomId is stored', async () => {
    const result = await persistenceService.getRoomId();

    expect(result).toBeNull();
  });

  it('clearRoomId removes the key from AsyncStorage', async () => {
    await persistenceService.saveRoomId('room-to-clear');

    await persistenceService.clearRoomId();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ROOM_ID_KEY);
  });

  it('getRoomId returns null after clearRoomId', async () => {
    await persistenceService.saveRoomId('room-to-clear');
    await persistenceService.clearRoomId();

    const result = await persistenceService.getRoomId();

    expect(result).toBeNull();
  });
});
