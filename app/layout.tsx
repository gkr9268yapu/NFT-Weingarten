import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";

export const metadata: Metadata = {
  title: "NFT Weingarten",
  description: "Team management platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}