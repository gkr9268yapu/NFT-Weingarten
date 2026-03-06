import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, saveRefreshToken } from "@/lib/googleDrive";

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
