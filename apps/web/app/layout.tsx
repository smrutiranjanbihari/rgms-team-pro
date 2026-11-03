import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "RGMS Team Pro", description: "Rural Game Management System" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
