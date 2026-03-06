import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function DELETE(req: NextRequest) {
    try {
        const { docId, driveFileId } = await req.json();

        if (!docId || !driveFileId) {
            return NextResponse.json({ error: "Missing docId or driveFileId" }, { status: 400 });
        }

        const drive = await getDriveClient();
        await drive.files.delete({ fileId: driveFileId });
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