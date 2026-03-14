import { type NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
        if (!fileId) return new NextResponse("No fileId", { status: 400 });

        const drive = await getDriveClient();
        const response = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);
        const contentType = (response.headers["content-type"] as string) || "application/octet-stream";
        const isDownload = req.nextUrl.searchParams.get("download") === "1";
        const fileName = req.nextUrl.searchParams.get("name") ?? "file";

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": isDownload ? "application/octet-stream" : contentType,
                "Cache-Control": "public, max-age=3600",
                ...(isDownload ? { "Content-Disposition": `attachment; filename="${fileName}"` } : {}),
            },
        });

    } catch (err: unknown) {
        console.error("Image proxy error:", err);
        const empty = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
        return new NextResponse(empty, {
            status: 200,
            headers: { "Content-Type": "image/gif" },
        });
    }
}