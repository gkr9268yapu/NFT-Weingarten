importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    const { title, body } = payload.notification ?? {};
    self.registration.showNotification(title ?? "NFT Weingarten", {
        body: body ?? "New message",
        icon: "/logo.png",
        badge: "/logo.png",
        data: payload.data,
    });
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
    const url = e.notification.data?.url ?? "/chat";
    e.waitUntil(clients.openWindow(url));
});