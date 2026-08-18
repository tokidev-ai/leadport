import type { Metadata } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Two families max (LP-02 AC): Lexend for headings, Source Sans 3 for body.
// Both self-hosted via next/font — no runtime request to Google Fonts.
const fontHeading = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const fontBody = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeadPort",
  description: "Real estate link-in-bio with lead capture.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontHeading.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
