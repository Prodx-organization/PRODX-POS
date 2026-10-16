/**
 * PRODX POS - Firebase Cloud Messaging (FCM) Service
 */

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn('[FCM] Firebase Messaging not supported in this environment:', e);
}

export async function requestFcmPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('[FCM] Messaging is not initialized.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined)
      });
      if (currentToken) {
        console.info('[FCM] Registration Token obtained:', currentToken);
        localStorage.setItem('prodx_fcm_token', currentToken);
        return currentToken;
      }
    } else {
      console.warn('[FCM] Notification permission denied by user.');
    }
  } catch (err) {
    console.error('[FCM] Error retrieving FCM token:', err);
  }
  return null;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  try {
    return onMessage(messaging, (payload) => {
      console.info('[FCM] Foreground message received:', payload);
      callback(payload);
    });
  } catch (e) {
    return () => {};
  }
}

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem('prodx_fcm_token');
  } catch {
    return null;
  }
}
