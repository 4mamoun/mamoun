import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

export default function DataSync() {
  const { isLoggedIn } = useAuthStore();
  const { subscribeToFirestore, initFromFirestore } = useDataStore();

  useEffect(() => {
    if (!isLoggedIn) return;
    let unsub: (() => void) | undefined;

    initFromFirestore().then(() => {
      console.log('[DataSync] Init complete, starting subscriptions...');
      unsub = subscribeToFirestore();
    });

    return () => {
      unsub?.();
    };
  }, [isLoggedIn]);

  return null;
}
