# Google Drive Setup Guide

Follow these steps ONCE to connect your Google Drive to the app.

---

## Step 1 — Create OAuth credentials in Google Cloud Console

1. Go to https://console.cloud.google.com
2. Select your project (or create a new one)
3. Go to **APIs & Services → Library**
4. Search for **"Google Drive API"** and click **Enable**
5. Go to **APIs & Services → Credentials**
6. Click **+ Create Credentials → OAuth client ID**
7. Application type: **Web application**
8. Name: "Football Club"
9. Under **Authorised redirect URIs**, add:
   - `http://localhost:3000/api/auth/google/callback`  ← for development
   - `https://yourdomain.com/api/auth/google/callback` ← for production
10. Click **Create**
11. Copy the **Client ID** and **Client Secret**

---

## Step 2 — Configure OAuth consent screen (if not done)

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **External**
3. Fill in App name, support email
4. Under **Scopes**, add: `https://www.googleapis.com/auth/drive.file`
5. Under **Test users**, add your Gmail address
6. Save

> Note: While in "Testing" mode, only test users can authorise.
> To allow anyone, publish the app (requires Google verification for sensitive scopes).

---

## Step 3 — Get your Google Drive Folder ID

1. Go to https://drive.google.com
2. Create a folder (e.g. "Football Club Media") or use existing
3. Open the folder
4. Copy the ID from the URL:
   `https://drive.google.com/drive/folders/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs`**
                                              ↑ this is your folder ID

---

## Step 4 — Add to .env.local

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-yourSecret
GOOGLE_DRIVE_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 5 — Connect your account (one-time, host only)

1. Start the app: `npm run dev`
2. Log in as **Host**
3. Go to the **Media** page
4. Click **🔗 Connect Drive**
5. You'll be redirected to Google — approve the permissions
6. You'll be sent back to the Media page with a success message
7. Done! All image uploads now go to your Google Drive folder.

---

## How it works

```
User uploads image
       ↓
Browser → POST /api/upload (Next.js API route)
       ↓
Server uses your refresh token to get an access token
       ↓
File uploaded to Google Drive folder
       ↓
File made publicly viewable
       ↓
Drive URL + metadata saved to Firestore
       ↓
All users see the image via Firestore real-time listener
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "No refresh token received" | Go to https://myaccount.google.com/permissions, revoke the app, then click Connect Drive again |
| "Google Drive not connected" | Host hasn't clicked Connect Drive yet |
| Images show broken icon | Drive can take 10–30 seconds to make a new file publicly viewable. Refresh the page. |
| "Access blocked" error | Add your email as a test user in OAuth consent screen |
