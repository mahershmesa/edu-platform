import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "أساس أكاديمي", template: "%s · أساس أكاديمي" },
  description: "منصة تعليمية عربية متكاملة: دورات بالفيديو وامتحانات مع أفضل المعلمين.",
};

export const viewport: Viewport = { themeColor: "#237a46", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
