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
  title: {
    default: "Compound · Memory OS",
    template: "%s",
  },
  description:
    "Memory OS for a one-person Grok Bot company. Install shared memory, then pick role bots from the public archive.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${plexMono.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          {children}
          <footer className="mt-auto border-t border-line px-4 py-5 text-center text-xs leading-relaxed text-mute">
            <span className="text-paper/80">Compound</span> — Memory OS for a
            one-person Grok Bot company. Inspired by{" "}
            <a
              className="text-brass hover:underline"
              href="https://x.com/kingwilliam_/status/2096273503901122746"
            >
              @kingwilliam_
            </a>
            . Archive is a research mirror of{" "}
            <a
              className="text-brass hover:underline"
              href="https://github.com/Agenticpirate/bot-repository"
            >
              Agenticpirate/bot-repository
            </a>
            . Never invent serials. Never strip attribution.
          </footer>
        </div>
      </body>
    </html>
  );
}
