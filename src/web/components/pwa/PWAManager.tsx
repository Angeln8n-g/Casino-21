/// <reference types="vite-plugin-pwa/react" />
import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { InstallPrompt } from './InstallPrompt';
import { UpdateNotification } from './UpdateNotification';
import { OfflineFallback } from './OfflineFallback';

export const PWAManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // `useRegisterSW` handles SW registration and updates automatically
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('Service Worker registered:', r);
      // Track SW registration if analytics is implemented
    },
    onRegisterError(error: Error) {
      console.error('Service Worker registration failed:', error);
    },
  });

  const closeUpdateNotification = () => {
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (offlineReady) {
      console.log('App is ready to work offline');
      // Track offline readiness if analytics is implemented
    }
  }, [offlineReady]);

  return (
    <>
      <OfflineFallback />
      <InstallPrompt />
      <UpdateNotification 
        needRefresh={needRefresh} 
        updateServiceWorker={updateServiceWorker} 
        close={closeUpdateNotification} 
      />
      {children}
    </>
  );
};
