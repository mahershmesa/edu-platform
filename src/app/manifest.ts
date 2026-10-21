import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "أساس أكاديمي",
    short_name: "أساس",
    description: "منصة تعليمية عربية: دروس فيديو وامتحانات مع أفضل المدرسين",
    lang: "ar",
    dir: "rtl",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8f7",
    theme_color: "#237a46",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "دوراتي", url: "/my-courses", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "تفعيل كود", url: "/redeem", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
