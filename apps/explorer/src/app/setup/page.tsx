import { Suspense } from "react";
import type { Metadata } from "next";
import { SetupWizard } from "@/components/SetupWizard";
import { SiteHeader } from "@/components/SiteHeader";

const title = "Setup · Compound";
const description =
  "Twelve copy-paste prompts that install Compound’s memory OS on the bots you already run. Progress is stored in this browser only.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary", title, description },
};

export default function SetupPage() {
  return (
    <>
      <SiteHeader active="setup" />
      <main id="main">
        <Suspense fallback={<SetupFallback />}>
          <SetupWizard />
        </Suspense>
      </main>
    </>
  );
}

function SetupFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p className="font-mono text-xs text-mute">Loading setup…</p>
      <div className="mt-6 h-48 animate-pulse rounded-2xl border border-line bg-panel/40" />
    </div>
  );
}
