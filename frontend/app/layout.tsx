import type { Metadata } from "next";
import { Cinzel_Decorative, DM_Sans } from "next/font/google";
import "./globals.css";

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ClashGPT - Your Clash Royale AI Companion",
  description: "Ask questions about Clash Royale, discover the meta, and get deck recommendations - all powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzelDecorative.variable} ${dmSans.variable} antialiased font-[family-name:var(--font-body)]`}
      >
        {children}
      </body>
    </html>
  );
}
