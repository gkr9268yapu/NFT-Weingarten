import { NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";

export async function POST() {
    try {
        // Step 1 - test Drive connection
        console.log("Step 1: connecting to Drive...");
        const drive = await getDriveClient();
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
        console.log("Step 1 OK. folderId:", folderId);

        // Step 2 - list files
        console.log("Step 2: listing files...");
        const driveRes = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: "files(id,name,createdTime,mimeType)",
            orderBy: "createdTime desc",
        });
        const driveFiles = driveRes.data.files ?? [];
        console.log("Step 2 OK. files found:", driveFiles.length);

        // Step 3 - Firebase Admin
        console.log("Step 3: connecting to Firestore Admin...");
        const { initializeApp, getApps, cert } = await import("firebase-admin/app");
        const { getFirestore } = await import("firebase-admin/firestore");

        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
        console.log("Admin project:", process.env.FIREBASE_ADMIN_PROJECT_ID);
        console.log("Admin email:", process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
        console.log("Private key starts with:", privateKey?.slice(0, 40));

        if (!getApps().length) {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
                    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
                    privateKey,
                }),
            });
        }
        const db = getFirestore();
        console.log("Step 3 OK");

        // Step 4 - get existing media
        console.log("Step 4: getting existing media docs...");
        const mediaSnap = await db.collection("media").get();
        const existingIds = new Set(mediaSnap.docs.map(d => d.data().driveFileId as string));
        console.log("Step 4 OK. existing:", existingIds.size);

        // Step 5 - add new ones
        let added = 0;
        for (const file of driveFiles) {
            console.log("checking file:", file.id, file.name, file.mimeType);
            if (!file.id || existingIds.has(file.id)) {
                console.log("skipping - already exists or no id");
                continue;
            }
            if (!file.mimeType?.startsWith("image/")) {
                console.log("skipping - not an image, mimeType:", file.mimeType);
                continue;
            }

            await drive.permissions.create({
                fileId: file.id,
                requestBody: { role: "reader", type: "anyone" },
            }).catch(() => { });

            const today = new Date(file.createdTime ?? Date.now()).toLocaleDateString("en-GB");
            await db.collection("media").add({
                url: `/api/image/${file.id}`,
                driveFileId: file.id,
                filename: file.name ?? "image",
                uploader: "Drive Sync",
                date: today,
                createdAt: new Date(),
            });
            added++;
        }

        console.log("Done. added:", added);
        return NextResponse.json({ success: true, added });

    } catch (err: unknown) {
        console.error("Drive sync FULL error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}