import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./PwaRegister";

export const metadata: Metadata = {
  title: "寻仙 Online · 玄幻修仙模拟器",
  description: "单人月令回合制 · 开放世界修仙模拟器 · 天玄大陆",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "寻仙" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
