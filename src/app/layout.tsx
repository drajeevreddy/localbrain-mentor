import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalBrain Mentor — Close the Skill Gap",
  description: "Resume-aware AI skill gap analyzer and free learning roadmap generator. Paste your resume, paste a job description, get a personalized learning roadmap.",
  openGraph: {
    title: "LocalBrain Mentor — Close the Skill Gap",
    description: "AI skill gap analyzer and free learning roadmap generator",
    url: "https://mentor.localbrain.in",
    siteName: "LocalBrain Mentor",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "LocalBrain Mentor",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalBrain Mentor — Close the Skill Gap",
    description: "AI skill gap analyzer and free learning roadmap generator",
    images: ["/og-image.svg"],
  },
  metadataBase: new URL("https://mentor.localbrain.in"),
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
