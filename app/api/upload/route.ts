import { NextRequest, NextResponse } from "next/server";
import { Readable }                   from "stream";
import { getDriveClient }             from "@/lib/googleDrive";
import { db }                         from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const file     = form.get("file")     as File   | null;
    const uploader = form.get("uploader") as string | null;

    if (!file || !uploader) {
      return NextResponse.json({ error: "Missing file or uploader" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const drive  = await getDriveClient();

    // Upload to Google Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name:    file.name,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: file.type || "image/jpeg",
        body:     Readable.from(buffer),
      },
      fields: "id, name",
    });

    const fileId   = driveRes.data.id!;
    const fileName = driveRes.data.name!;

    // Make it publicly viewable so <img> tags work
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const imageUrl = `/api/image/${fileId}`;
    const today    = new Date().toLocaleDateString("en-GB");

    // Save metadata to Firestore so all users see it in real-time
    const docRef = await addDoc(collection(db, "media"), {
      url:         imageUrl,
      driveFileId: fileId,
      filename:    fileName,
      uploader,
      date:        today,
      createdAt:   serverTimestamp(),
    });

    return NextResponse.json({
      success:  true,
      id:       docRef.id,
      url:      imageUrl,
      filename: fileName,
      uploader,
      date:     today,
    });

  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
