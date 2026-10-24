// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Background message handler stub
try {
  firebase.initializeApp({
    apiKey: "AIzaSyC-aX_ni6Fr2_ZLe05vpm0wsH-Ql7C4mFM",
    projectId: "modified-bit-mct7q",
    messagingSenderId: "763690681010",
    appId: "1:763690681010:web:875621933f363383aebfab"
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'PRODX POS Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'New alert from PRODX POS',
      icon: '/favicon.svg'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.error('Service worker initialization error:', err);
}
