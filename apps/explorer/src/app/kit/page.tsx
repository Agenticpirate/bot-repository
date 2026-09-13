import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { compound } from "@/lib/compound";

export const metadata = {
  title: "Starter pack · Compound",
  description: "Memory Steward, Who-I-Am, DECISIONS, shared-vs-private, weekly prune.",
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
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
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
          </Link>{" "}
          in parallel.
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {files.map((item) => (
            <section key={item.file} id={item.file.replace(/\.md$/, "")}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl text-paper">{item.title}</h2>
                <span className="font-mono text-[10px] text-mute">{item.file}</span>
              </div>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-panel p-4 font-mono text-[12px] leading-relaxed text-paper/90">
                {item.text}
              </pre>
            </section>
          ))}
        </div>

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
