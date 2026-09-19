import { Suspense } from "react";
import type { Metadata } from "next";
import { Explorer } from "@/components/Explorer";
import { SiteHeader } from "@/components/SiteHeader";

const title = "Archive · Compound";
const description =
  "Pick role bots and skills from the public research mirror to plug into your memory OS. Seed index of real catalog rows — nothing invented.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary", title, description },
};

export default function ExplorePage() {
  return (
    <>
      <SiteHeader active="explore" />
      <main id="main">
        <Suspense fallback={<ExploreFallback />}>
          <Explorer />
        </Suspense>
      </main>
    </>
  );
}

function ExploreFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p className="font-mono text-xs text-mute">Loading archive…</p>
      <div className="mt-6 h-40 animate-pulse rounded-2xl border border-line bg-panel/40" />
    </div>
  );
}
