import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
        const drive = await getDriveClient();
        await drive.files.delete({ fileId });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.warn("Drive file delete warning:", err);
        return NextResponse.json({ success: true }); // Don't fail if already deleted
    }
}