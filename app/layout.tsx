import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./themes.css";
import { defaultTheme, themeBrowserColors } from "./lib/themes";

const publicBasePath = process.env.PAGES_BUILD === "1"
  ? (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "")
  : "";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: themeBrowserColors[defaultTheme].top,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PAGES_BUILD === "1" ? "https://chanstonee.github.io" : "https://chans2.chanstones2.chatgpt.site"),
  title: "wedding invitaion",
  description: "2027. 05. 15 PM 06:30, First Garden에서 열리는 결혼식에 초대합니다.",
  icons: {
    icon: [{ url: `${publicBasePath}/assets/invitation/favicon-figma.png`, type: "image/png" }],
    shortcut: `${publicBasePath}/assets/invitation/favicon-figma.png`,
    apple: `${publicBasePath}/assets/invitation/favicon-figma.png`,
  },
  openGraph: {
    title: "wedding invitaion",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [{ url: `${publicBasePath}/assets/invitation/og-figma.png`, width: 620, height: 332, alt: "wedding invitaion" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "wedding invitaion",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [`${publicBasePath}/assets/invitation/og-figma.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
