import { Suspense } from "react";
import { Explorer } from "@/components/Explorer";

export default function Home() {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-16 font-mono text-xs text-mute">Loading explorer…</p>
      }
    >
      <Explorer />
    </Suspense>
  );
}
