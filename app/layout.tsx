import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./themes.css";

const publicBasePath =
  process.env.PAGES_BUILD === "1"
    ? (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "")
    : "";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f0e7",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.PAGES_BUILD === "1"
      ? "https://chanstonee.github.io"
      : "https://chans2.chanstones2.chatgpt.site",
  ),
  title: "재훈 & 다연의 결혼식에 초대합니다",
  description:
    "2027. 05. 15 PM 06:30, First Garden에서 열리는 결혼식에 초대합니다.",
  icons: {
    icon: [{ url: `${publicBasePath}/assets/invitation/favicon-figma.png`, type: "image/png" }],
    shortcut: `${publicBasePath}/assets/invitation/favicon-figma.png`,
    apple: `${publicBasePath}/assets/invitation/favicon-figma.png`,
  },
  openGraph: {
    title: "재훈 & 다연의 결혼식에 초대합니다",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [
      {
        url: `${publicBasePath}/assets/invitation/og-figma.png`,
        width: 620,
        height: 332,
        alt: "재훈 & 다연의 결혼식",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "재훈 & 다연의 결혼식에 초대합니다",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [`${publicBasePath}/assets/invitation/og-figma.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
