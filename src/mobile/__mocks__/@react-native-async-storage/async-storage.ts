// Manual mock for @react-native-async-storage/async-storage
const store: Record<string, string> = {};

const AsyncStorage = {
  setItem: jest.fn((key: string, value: string): Promise<void> => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string): Promise<string | null> => {
    return Promise.resolve(store[key] ?? null);
  }),
  removeItem: jest.fn((key: string): Promise<void> => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn((): Promise<void> => {
    Object.keys(store).forEach((k) => delete store[k]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn((): Promise<string[]> => {
    return Promise.resolve(Object.keys(store));
  }),
  multiGet: jest.fn((keys: string[]): Promise<[string, string | null][]> => {
    return Promise.resolve(keys.map((k) => [k, store[k] ?? null]));
  }),
  multiSet: jest.fn((pairs: [string, string][]): Promise<void> => {
    pairs.forEach(([k, v]) => { store[k] = v; });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]): Promise<void> => {
    keys.forEach((k) => delete store[k]);
    return Promise.resolve();
  }),
  _store: store,
};

export default AsyncStorage;
