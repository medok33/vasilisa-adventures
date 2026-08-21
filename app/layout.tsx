import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Приключения Василисы",
  description: "Добрые ежедневные миссии, чтение, учёба и финансовые приключения Василисы.",
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
