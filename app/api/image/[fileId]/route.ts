import { type NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive";

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await context.params;

        if (!fileId) {
            return new NextResponse(
                JSON.stringify({ error: "No fileId provided" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const drive = await getDriveClient();

        const response = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);
        const contentType = (response.headers["content-type"] as string) || "image/jpeg";

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000",
            },
        });

    } catch (err: unknown) {
        console.error("Image proxy error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return new NextResponse(
            JSON.stringify({ error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}