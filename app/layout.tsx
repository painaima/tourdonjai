import {LineProvider} from '@/components/line-booking';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ทัวร์โดนใจ | ทัวร์และบริการเดินทาง",
  description: "ค้นหาทัวร์ บริการวีซ่า ตั๋วเครื่องบิน และตั๋วกิจกรรม พร้อมขอใบเสนอราคา",
  other: {
    "codex-preview": "development",
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
    <html lang="th">
      <body className="antialiased"><LineProvider>{children}</LineProvider></body>
    </html>
  );
}
