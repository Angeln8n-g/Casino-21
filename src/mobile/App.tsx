import { registerRootComponent } from 'expo';
import React from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './store/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';

// Suppress socket connection warnings — handled silently in socketService
LogBox.ignoreLogs([
  'Socket connect_error',
  'Socket connection error',
  'connect_error',
  'Connection timeout',
  'Clipboard has been extracted',
]);

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
export default App;
