import type { Metadata } from "next";
import "./globals.css";
import StarryBackground from "@/components/StarryBackground";

export const metadata: Metadata = {
  title: "EG FFA Tournament Bracket",
  description: "956-player MCSR Ranked tournament bracket viewer with rank colors and opponent projections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StarryBackground />
        {children}
      </body>
    </html>
  );
}
