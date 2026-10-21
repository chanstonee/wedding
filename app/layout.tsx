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
    icon: [{ url: `${publicBasePath}/Favicon.png`, type: "image/png" }],
    shortcut: `${publicBasePath}/Favicon.png`,
    apple: `${publicBasePath}/Favicon.png`,
  },
  openGraph: {
    title: "재훈 & 다연의 결혼식에 초대합니다",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [
      {
        url: `${publicBasePath}/assets/invitation/section-5-img.jpg`,
        width: 1559,
        height: 2048,
        alt: "재훈 & 다연의 결혼식",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "재훈 & 다연의 결혼식에 초대합니다",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [`${publicBasePath}/assets/invitation/section-5-img.jpg`],
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
