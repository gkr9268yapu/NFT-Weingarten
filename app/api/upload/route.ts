import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getDriveClient } from "@/lib/googleDrive";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const uploader = form.get("uploader") as string | null;
    const chatOnly = form.get("chatOnly") as string | null; // "true" = don't save to media collection

    if (!file || !uploader) {
      return NextResponse.json({ error: "Missing file or uploader" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const drive = await getDriveClient();

    const driveRes = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: Readable.from(buffer),
      },
      fields: "id, name",
    });

    const fileId = driveRes.data.id!;
    const fileName = driveRes.data.name!;

    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const fileUrl = `/api/image/${fileId}`;
    const today = new Date().toLocaleDateString("en-GB");

    // Only save to media collection if it's a media page upload
    if (!chatOnly) {
      await addDoc(collection(db, "media"), {
        url: fileUrl,
        driveFileId: fileId,
        filename: fileName,
        uploader,
        date: today,
        createdAt: serverTimestamp(),
      });
    }

    // File size
    const bytes = file.size;
    const fileSize = bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: fileName,
      fileSize,
      uploader,
      date: today,
    });

  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}