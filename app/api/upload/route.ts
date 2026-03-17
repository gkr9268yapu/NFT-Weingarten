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
    const chatOnly = form.get("chatOnly") as string | null;

    if (!file || !uploader) {
      return NextResponse.json({ error: "Missing file or uploader" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));    const drive = await getDriveClient();
    try { await drive.files.list({ pageSize: 1, fields: "files(id)" }); } catch { }

    // Use separate folder for chat files vs media files
    const folderId = chatOnly === "true"
      ? process.env.GOOGLE_CHAT_FOLDER_ID!
      : process.env.GOOGLE_DRIVE_FOLDER_ID!;

    let driveRes;
    let retries = 0;
    while (retries < 3) {
      try {
        const freshDrive = await getDriveClient();
        driveRes = await freshDrive.files.create({
          requestBody: {
            name: file.name,
            parents: [folderId],
          },
          media: {
            mimeType: file.type || "application/octet-stream",
            body: Readable.from(buffer),
          },
          fields: "id, name",
        });
        break;
      } catch (err: unknown) {
        retries++;
        if (retries >= 3) throw err;
        await new Promise(res => setTimeout(res, 2000 * retries));
      }
    }
    if (!driveRes) throw new Error("Upload failed after retries");

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

    const bytes = file.size;
    const fileSize = bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: fileName,
      fileSize,
      driveFileId: fileId,
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