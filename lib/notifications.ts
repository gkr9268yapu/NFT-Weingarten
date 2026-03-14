import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { saveFCMToken } from "./firebaseDB";

export async function initPushNotifications(userId: string): Promise<void> {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    try {
        // Request permission
        const permission = await Notification.requestPermission();
        console.log("Notification permission:", permission);
        if (permission !== "granted") return;

        const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
        const { app } = await import("./firebase");

        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
            console.error("Missing NEXT_PUBLIC_FCM_VAPID_KEY");
            return;
        }

        // Register service worker via /api/sw so it gets real Firebase config
        const swReg = await navigator.serviceWorker.register("/api/sw", { scope: "/" });
        await navigator.serviceWorker.ready;
        console.log("Service worker registered:", swReg.scope);

        const messaging = getMessaging(app);

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swReg,
        });

        console.log("FCM token:", token ? "obtained" : "failed");
        if (token) await saveFCMToken(userId, token);

        // Handle foreground messages
        onMessage(messaging, payload => {
            console.log("Foreground message received:", payload);
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