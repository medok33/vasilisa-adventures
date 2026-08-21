import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Приключения Василисы",
  description: "Добрые ежедневные миссии, чтение, учёба и финансовые приключения Василисы.",
  openGraph: {
    title: "Приключения Василисы",
    description: "Каждый день — новое доброе приключение",
    type: "website",
    url: "https://vasilisa-adventures.m6300187.chatgpt.site",
    images: [{ url: "https://vasilisa-adventures.m6300187.chatgpt.site/og.png", width: 1200, height: 630, alt: "Приключения Василисы" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Приключения Василисы",
    description: "Каждый день — новое доброе приключение",
    images: ["https://vasilisa-adventures.m6300187.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
