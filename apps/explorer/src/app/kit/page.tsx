import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { KitFiles } from "@/components/KitFiles";
import { SiteHeader } from "@/components/SiteHeader";
import { compound } from "@/lib/compound";

const title = "Starter pack · Compound";
const description =
  "Memory Steward, Who-I-Am, DECISIONS, shared-vs-private, and weekly prune — copy-ready files for the Compound memory OS.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary", title, description },
};

const FILES = [
  ["memory-steward.md", "Memory Steward"],
  ["who-i-am.md", "Who I Am"],
  ["DECISIONS.md", "DECISIONS log"],
  ["shared-vs-private.md", "Shared vs private"],
  ["weekly-prune.md", "Weekly prune"],
] as const;

async function loadStarter() {
  const dir = path.join(process.cwd(), "content/compound/starter");
  return Promise.all(
    FILES.map(async ([file, title]) => ({
      file,
      title,
      text: await readFile(path.join(dir, file), "utf8"),
    })),
  );
}

export default async function KitPage() {
  const files = await loadStarter();
  return (
    <>
      <SiteHeader active="kit" />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
          Starter pack
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-paper">
          Paste these into Grok. Do not invent a second company voice.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Canonical copies live in{" "}
          <code className="font-mono text-brass/90">products/compound/starter/</code>
          . Same files are mirrored here so the app runs without the archive
          tree.{" "}
          <Link href="/setup" className="text-brass hover:underline">
            Run the 12-step setup
          </Link>
          , then{" "}
          <Link href="/explore" className="text-brass hover:underline">
            pick roles from the archive
          </Link>
          .
        </p>

        <KitFiles files={files} />

        <p className="mt-10 text-xs leading-relaxed text-mute">
          Inspired by{" "}
          <a
            href={compound.attribution.url}
            className="text-brass hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {compound.attribution.handle}
          </a>
          . {compound.attribution.note}
        </p>
      </main>
    </>
  );
}
