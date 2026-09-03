import type { Metadata } from "next";
import { kumbh, roboto } from '../lib/fonts'
import { withBasePath } from '@/lib/basePath'
import "./globals.css";

export const metadata: Metadata = {
  title: "Mint Leaf",
  description: "FFXIV Rotation Builder",
  // Metadata の icons も静的 export では basePath が付かないことがある
  icons: withBasePath("/favicon.ico"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={roboto.className + ' ' + kumbh.className}>
        {children}
      </body>
    </html>
  );
}
