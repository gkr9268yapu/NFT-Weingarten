import { NextResponse } from "next/server";
import { getAuthUrl }   from "@/lib/googleDrive";

// GET /api/auth/google
// Host visits this to connect their Google Drive account
export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("OAuth init error:", err);
    return NextResponse.json({ error: "Failed to start OAuth flow" }, { status: 500 });
  }
}
