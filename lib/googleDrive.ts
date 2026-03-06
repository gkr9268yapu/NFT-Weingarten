import { google } from "googleapis";

/* Create OAuth2 client */
export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!; // e.g., http://localhost:3000/api/auth/google/callback

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/* Get Google OAuth consent URL */
export function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  const scopes = ["https://www.googleapis.com/auth/drive"];
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}

/* Save refresh token for future use */
export async function saveRefreshToken(token: string) {
  // save token securely (e.g., in .env.local or database)
  console.log("Refresh token:", token);
}

/* Existing function */
export async function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google credentials. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to .env.local"
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth });
}