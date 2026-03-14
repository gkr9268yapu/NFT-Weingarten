import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { saveFCMToken } from "./firebaseDB";

let messaging: import("firebase/messaging").Messaging | null = null;

export async function initPushNotifications(userId: string): Promise<void> {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    try {
        const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
        const { app } = await import("./firebase");

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        messaging = getMessaging(app);

        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) return;

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.register("/api/sw"),        });

        if (token) await saveFCMToken(userId, token);

        // Foreground messages
        onMessage(messaging, payload => {
            const { title, body } = payload.notification ?? {};
            if (Notification.permission === "granted") {
                new Notification(title ?? "NFT Weingarten", {
                    body: body ?? "New message",
                    icon: "/logo.png",
                    badge: "/logo.png",
                });
            }
        });
    } catch (err) {
        console.error("Push init error:", err);
    }
}

export async function sendPushToUser(
    userId: string, title: string, body: string, url?: string
): Promise<void> {
    try {
        const snap = await getDoc(doc(db, "users", userId));
        const token = snap.data()?.fcmToken as string | undefined;
        if (!token) return;

        await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, title, body, url }),
        });
    } catch (err) {
        console.error("sendPushToUser error:", err);
    }
}

export async function sendPushToAll(
    excludeUserId: string, title: string, body: string, url?: string
): Promise<void> {
    try {
        const { getDocs, collection } = await import("firebase/firestore");
        const snap = await getDocs(collection(db, "users"));
        for (const d of snap.docs) {
            if (d.id === excludeUserId) continue;
            const token = d.data().fcmToken as string | undefined;
            if (!token) continue;
            await fetch("/api/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, title, body, url }),
            });
        }
    } catch (err) {
        console.error("sendPushToAll error:", err);
    }
}