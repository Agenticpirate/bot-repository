import type { Metadata } from "next";
import { MotionGallery } from "@/components/MotionGallery";
import { SiteHeader } from "@/components/SiteHeader";

const title = "Motion language · Compound";
const description =
  "Original Compound agent avatars, thinking marks, and icon kit — inspired by public Grok, Muse, Claude, and ChatGPT UX patterns. No vendor logos.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary", title, description },
};

export default function MotionPage() {
  return (
    <>
      <SiteHeader active="motion" />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
          Compound · motion
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
          Agent faces without someone else’s mascot.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
          One visual system, four dialects. Pebbles, marks, and Lucide icons are
          Compound’s. The tabs below are inspired by publicly described UX
          patterns — not copies of logos, wordmarks, or trademarked characters.
        </p>
        <p className="mt-3 text-sm text-mute">
          Pattern credits and the hard no-clone list live in{" "}
          <code className="font-mono text-brass/90">apps/explorer/docs/MOTION.md</code>
          .
        </p>

        <div className="mt-10">
          <MotionGallery />
        </div>
      </main>
    </>
  );
}
