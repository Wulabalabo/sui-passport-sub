import "~/styles/globals.css";

import { type Metadata } from "next";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react"
import Footer from "~/components/Footer";

export const metadata: Metadata = {
  title: "Sui Community Passport",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={``}>
      <body>
        <Providers>
          {children}
          <Footer />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
