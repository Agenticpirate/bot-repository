import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Archive explorer · bot-repository",
  description:
    "Search the Agenticpirate/bot-repository research mirror. Canonical pages live on the source sites.",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${plexMono.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          {children}
          <footer className="mt-auto border-t border-line px-4 py-5 text-center text-xs leading-relaxed text-mute">
            Research mirror of{" "}
            <a
              className="text-brass hover:underline"
              href="https://github.com/Agenticpirate/bot-repository"
            >
              Agenticpirate/bot-repository
            </a>
            . Serials, titles, and prompts are copied as published. Never invent
            serials. Never strip attribution.
          </footer>
        </div>
      </body>
    </html>
  );
}
