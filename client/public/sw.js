self.addEventListener('push', (event) => {
  let data = { title: 'BeniFits', body: 'You have a new notification.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
