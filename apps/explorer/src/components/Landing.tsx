import Link from "next/link";
import { MEMORY_LAWS, compound } from "@/lib/compound";
import { readManifest, topTypes } from "@/lib/manifest";
import { plural } from "@/lib/format";
import { ArchiveStats } from "./ArchiveStats";
import { FeaturedShelves } from "./FeaturedShelves";
import { SiteHeader } from "./SiteHeader";

export async function Landing() {
  const manifest = await readManifest();
  const leading = topTypes(manifest.types, 3);

  return (
    <>
      <SiteHeader active="home" />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <section className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
            One-person Grok Bot company
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-paper sm:text-5xl sm:leading-[1.1]">
            Memory OS for the company you already run.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-mute">
            Same bots. Same budget. Install shared vs private memory, a Who-I-Am
            profile, named skills, a decisions log, and a weekly prune — then seat
            real role bots from the public archive.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            <PathCard
              n="01"
              title="Setup"
              body="Twelve copy-paste prompts. Mark done in this browser."
              href="/setup"
              cta="Start setup"
              primary
            />
            <PathCard
              n="02"
              title="Kit"
              body="Memory Steward, Who I Am, DECISIONS, prune files."
              href="/kit"
              cta="Open starter pack"
            />
            <PathCard
              n="03"
              title="Explore"
              body={`Pick from ${manifest.indexed.toLocaleString()} real seed listings.`}
              href="/explore"
              cta="Browse the archive"
            />
          </ol>
        </section>

        <section className="mt-14" aria-labelledby="archive-scale">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                Archive scale
              </p>
              <h2 id="archive-scale" className="font-display mt-1 text-2xl font-semibold text-paper">
                A research mirror, counted from the seed.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-mute">
              {leading.map(([type, count], index) => (
                <span key={type}>
                  {index > 0 ? " · " : ""}
                  {plural(count, type)}
                </span>
              ))}{" "}
              in this committed seed. Counts are not estimates.
            </p>
          </div>
          <ArchiveStats manifest={manifest} />
        </section>

        <section className="mt-16 grid gap-3 md:grid-cols-3">
          <ProblemCard
            n="01"
            title="The pile"
            body="Private notes, shared facts, and leftover chat sit in one heap. Two bots “know” different versions of you."
          />
          <ProblemCard
            n="02"
            title="The scrap"
            body="You taught a procedure once. It died in a thread. Next week you teach it again."
          />
          <ProblemCard
            n="03"
            title="The reopen"
            body="Pricing, voice, and process get re-litigated because nothing was locked as a decision or a rule."
          />
        </section>

        <div className="mt-20">
          <FeaturedShelves />
        </div>

        <section className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                The OS
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-paper sm:text-3xl">
                Eight laws. Then the archive is a parts bin.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-mute">
              Compound does not add a thirteenth bot to “do strategy.” It makes
              the memory layer explicit so the twelve you already have stop
              drifting.
            </p>
          </div>
          <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {MEMORY_LAWS.map((law, index) => (
              <li key={law.title} className="bg-panel px-5 py-5">
                <p className="font-mono text-[10px] text-brass">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-[15px] font-medium text-paper">{law.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{law.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
              Archive-powered
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold text-paper sm:text-3xl">
              Plug role bots and skills into the OS — don’t invent them.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-mute">
              The public archive in this repo is a research mirror of published
              Grok bots, skills, SOUL.md templates, workflows, and marketplace
              listings. Use it as a catalog of seats and procedures. Canonical
              pages stay on the source sites. Compound never invents a serial.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex font-mono text-[12px] uppercase tracking-wider text-brass hover:underline"
            >
              Open the archive explorer →
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-panel/80 p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-mute">
              Setup is twelve pastes
            </p>
            <ol className="mt-3 space-y-2">
              {compound.steps.map((step) => (
                <li key={step.id} className="flex gap-3 text-sm">
                  <span className="font-mono text-[11px] text-brass">
                    {String(step.id).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="text-paper">{step.title}.</span>{" "}
                    <span className="text-mute">{step.summary}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-20 rounded-2xl border border-brass/25 bg-brass/8 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold text-paper">
                Install the OS this afternoon.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">
                Copy the twelve prompts. Stand up a Memory Steward. Fill Who I
                Am and DECISIONS. Then pick roles from the archive.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/setup"
                className="shrink-0 rounded-full bg-brass px-5 py-2.5 text-sm font-medium text-ink hover:bg-brass/90"
              >
                Start setup
              </Link>
              <Link
                href="/kit"
                className="shrink-0 rounded-full border border-line px-5 py-2.5 text-sm text-paper hover:border-brass/40"
              >
                Starter pack
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-12 max-w-2xl text-xs leading-relaxed text-mute">
          Inspired by {compound.attribution.handle}{" "}
          <a
            href={compound.attribution.url}
            className="text-brass hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {compound.attribution.inspiredBy}
          </a>
          . Thesis credit only — Compound is not a reprint. Archive listings
          keep their source URLs.
        </p>
      </main>
    </>
  );
}

function PathCard({
  n,
  title,
  body,
  href,
  cta,
  primary,
}: {
  n: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-panel/70 px-5 py-5">
      <p className="font-mono text-[10px] text-brass">{n}</p>
      <h2 className="mt-2 text-base font-medium text-paper">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">{body}</p>
      <Link
        href={href}
        className={`mt-4 inline-flex w-fit rounded-full px-3.5 py-1.5 text-sm ${
          primary
            ? "bg-brass font-medium text-ink hover:bg-brass/90"
            : "border border-line text-paper hover:border-brass/40"
        }`}
      >
        {cta}
      </Link>
    </li>
  );
}

function ProblemCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel/70 px-5 py-5">
      <p className="font-mono text-[10px] text-brass">{n}</p>
      <h2 className="mt-2 text-base font-medium text-paper">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>
    </div>
  );
}
