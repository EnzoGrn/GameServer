import type { Metadata } from "next";
import { DM_Sans } from 'next/font/google'
import "./globals.css";

/*
 * @brief Main font for the application.
 */
const font = DM_Sans({
  subsets: ["latin"]
});

/*
 * @brief Metadata for the application.
 * - Title      : Name of the application.
 * - Description: Description of the application.
 */
export const metadata: Metadata = {
  title: "WOOHP",
  description: "Real-time pictionnary game.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>)
{
  return (
    <html lang="en" data-theme="woohp">
      <body className={font.className}>
        {children}
      </body>
    </html>
  );
}
