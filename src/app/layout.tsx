import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalBrain Mentor — Close the Skill Gap",
  description: "Resume-aware AI skill gap analyzer and free learning roadmap generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
