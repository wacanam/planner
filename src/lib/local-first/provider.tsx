'use client';

import { useEffect } from 'react';
import { LOCAL_FIRST_CHANGE_EVENT } from './events';
import { migrateLegacyIDBToRxDB } from './legacy-idb-migration';
import { requestLocalFirstSync, syncLocalFirst } from './sync';

export function LocalFirstProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void migrateLegacyIDBToRxDB().then(() => {
      if (navigator.onLine) void syncLocalFirst();
    });

    const handleOnline = () => void syncLocalFirst();
    const handleLocalChange = () => requestLocalFirstSync();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestLocalFirstSync(0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener(LOCAL_FIRST_CHANGE_EVENT, handleLocalChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(LOCAL_FIRST_CHANGE_EVENT, handleLocalChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return children;
}
