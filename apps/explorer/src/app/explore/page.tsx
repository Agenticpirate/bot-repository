import { Suspense } from "react";
import type { Metadata } from "next";
import { Explorer } from "@/components/Explorer";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Archive · Compound",
  description:
    "Pick role bots and skills from the public research mirror to plug into your memory OS.",
};

export default function ExplorePage() {
  return (
    <>
      <SiteHeader active="explore" />
      <Suspense
        fallback={
          <p className="px-6 py-16 font-mono text-xs text-mute">Loading archive…</p>
        }
      >
        <Explorer />
      </Suspense>
    </>
  );
}
