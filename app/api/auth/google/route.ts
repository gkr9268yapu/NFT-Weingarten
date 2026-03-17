import { NextResponse } from "next/server";
import { google } from "googleapis";

function getAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive"],
    prompt: "consent",
  });
}
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
