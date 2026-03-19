import { NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";

export async function POST() {
    try {
        const drive = await getDriveClient();
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

        // Get all files from Drive folder
        // Debug - list ALL files without folder filter
        const driveRes = await drive.files.list({
            fields: "files(id,name,mimeType,parents)",
            pageSize: 50,
        });
        const allFiles = driveRes.data.files ?? [];
        console.log("ALL files OAuth can see:", allFiles.length);
        allFiles.forEach(f => console.log("  -", f.name, "parents:", JSON.stringify(f.parents)));

        // Also check the specific folder
        const folderCheck = await drive.files.get({
            fileId: folderId,
            fields: "id,name,owners",
        }).catch(e => { console.log("Folder access error:", e.message); return null; });
        console.log("Folder info:", folderCheck?.data);
        const driveFiles = driveRes.data.files ?? [];
        const driveIds = new Set(driveFiles.map(f => f.id!));
        console.log("Drive files found:", driveFiles.length);

        // Connect to Firestore Admin
        const { initializeApp, getApps, cert } = await import("firebase-admin/app");
        const { getFirestore } = await import("firebase-admin/firestore");
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
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

        // Get all existing media docs
        const mediaSnap = await db.collection("media").get();
        const existingIds = new Set<string>();

        // Delete Firestore docs where Drive file no longer exists
        let deleted = 0;
        for (const docSnap of mediaSnap.docs) {
            const driveFileId = docSnap.data().driveFileId as string;
            if (driveFileId && !driveIds.has(driveFileId)) {
                await docSnap.ref.delete();
                deleted++;
                console.log("Removed deleted file from Firestore:", driveFileId);
            } else {
                existingIds.add(driveFileId);
            }
        }
        console.log("Deleted stale docs:", deleted);

        // Add new files from Drive
        let added = 0;
        for (const file of driveFiles) {
            if (!file.id || existingIds.has(file.id)) continue;
            const isImage = file.mimeType?.startsWith("image/");
            const isVideo = file.mimeType?.startsWith("video/");
            if (!isImage && !isVideo) continue;

            await drive.permissions.create({
                fileId: file.id,
                requestBody: { role: "reader", type: "anyone" },
            }).catch(() => { });

            const today = new Date(file.createdTime ?? Date.now()).toLocaleDateString("en-GB");
            await db.collection("media").add({
                url: `/api/image/${file.id}`,
                driveFileId: file.id,
                filename: file.name ?? "file",
                uploader: "Drive Sync",
                date: today,
                mimeType: file.mimeType ?? "",
                createdAt: new Date(),
            });
            added++;
            console.log("Added:", file.name);
        }

        console.log("Sync complete. Added:", added, "Deleted:", deleted);
        return NextResponse.json({ success: true, added, deleted });

    } catch (err: unknown) {
        console.error("Drive sync error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}