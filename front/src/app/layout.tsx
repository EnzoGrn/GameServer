import type { Metadata } from "next";
import { DM_Sans } from 'next/font/google'
import "./globals.css";
import { SocketProvider } from "@/components/provider/SocketProvider";
import React from "react";
import { AudioProvider } from "@/lib/audio/audioProvider";
import { RoomProvider } from "@/lib/room/RoomProvider";

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
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap" rel="stylesheet" />
      </head>
      <body className={font.className}>
        <React.StrictMode>
          <SocketProvider>
            <AudioProvider>
            <RoomProvider>
            <div className={`h-screen flex justify-center items-center flex-col overflow-hidden bg-[url('assets/background.png')]`}>
              {children}
            </div>
            </RoomProvider>
            </AudioProvider>
          </SocketProvider>
        </React.StrictMode>
      </body>
    </html>
  );
}
