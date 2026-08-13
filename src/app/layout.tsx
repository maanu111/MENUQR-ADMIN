import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

/* Display face carries the personality; body face stays quiet and legible. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tablet — QR ordering and back office for restaurants",
  description:
    "Guests scan, browse and order from the table. Owners run the menu, staff, tables and reports from one dashboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1017" },
  ],
};

/* Applies the saved choice before first paint, so dark never flashes white. */
const themeScript = `(function(){try{var t=localStorage.getItem("tablet-theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
