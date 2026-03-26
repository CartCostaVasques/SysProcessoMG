// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.titulo || '💬 Nova mensagem', {
    body: data.corpo || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'chat-' + Date.now(),
    requireInteraction: false,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
