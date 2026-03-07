import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";

export const metadata: Metadata = {
  title: "Football Club",
  description: "Team management platform",
  viewport: "width=device-width, initial-scale=1",
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
