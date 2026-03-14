import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function DELETE(req: NextRequest) {
    try {
        const { docId, driveFileId } = await req.json() as { docId: string; driveFileId: string };

        if (!docId || !driveFileId) {
            return NextResponse.json({ error: "Missing docId or driveFileId" }, { status: 400 });
        }

        // 1. Delete from Google Drive (always attempt — log but don't fail if already gone)
        try {
            const drive = await getDriveClient();
            await drive.files.delete({ fileId: driveFileId });
        } catch (driveErr) {
            console.warn("Drive delete warning (may already be deleted):", driveErr);
        }

        // 2. Delete metadata from Firestore
        await deleteDoc(doc(db, "media", docId));

        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        console.error("Delete error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Delete failed" },
            { status: 500 }
        );
    }
}