import { NextRequest, NextResponse } from "next/server";

let adminApp: import("firebase-admin/app").App | null = null;

async function getAdminApp() {
    if (adminApp) return adminApp;
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    if (getApps().length) {
        adminApp = getApps()[0];
        return adminApp;
    }
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    adminApp = initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
            privateKey,
        }),
    });
    return adminApp;
}

export async function POST(req: NextRequest) {
    try {
        const { token, title, body, url } = await req.json();
        if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

        await getAdminApp();
        const { getMessaging } = await import("firebase-admin/messaging");

        await getMessaging().send({
            token,
            notification: { title, body },
            webpush: {
                notification: {
                    title,
                    body,
                    icon: "/logo.png",
                    badge: "/logo.png",
                },
                fcmOptions: { link: url ?? "/chat" },
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Notify error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}