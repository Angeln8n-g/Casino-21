// Manual mock for react-native used in Jest (node environment)
const AppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  currentState: 'active' as const,
};

export { AppState };
