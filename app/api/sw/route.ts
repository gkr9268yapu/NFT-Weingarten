import { NextResponse } from "next/server";

export async function GET() {
  const sw = `
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
  authDomain:        "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
  projectId:         "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
  storageBucket:     "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId:             "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "NFT Weingarten", {
    body:  body  ?? "New message",
    icon:  "/logo.png",
    badge: "/logo.png",
    data:  payload.data,
    vibrate: [200, 100, 200],
  });
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/chat";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
  `;

  return new NextResponse(sw, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}