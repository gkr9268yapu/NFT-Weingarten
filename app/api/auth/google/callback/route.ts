import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

async function saveRefreshToken(token: string) {
  console.log("Refresh token:", token);
}
// GET /api/auth/google/callback?code=...
// Google redirects here after the host approves access
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/media?drive_error=no_code`
    );
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens }   = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // This happens if the user already granted access before.
      // Revoking access at https://myaccount.google.com/permissions and
      // retrying will fix it (the "consent" prompt forces a new refresh token).
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/media?drive_error=no_refresh_token`
      );
    }

    await saveRefreshToken(tokens.refresh_token);

    // Redirect back to media page with success flag
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/media?drive_connected=1`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/media?drive_error=callback_failed`
    );
  }
}
