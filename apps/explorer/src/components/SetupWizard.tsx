"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  compound,
  exploreHref,
  getSetupDone,
  getSetupDoneServer,
  subscribeSetupDone,
  writeSetupDone,
  type CompoundStep,
} from "@/lib/compound";
import { SiteHeader } from "./SiteHeader";

export function SetupWizard() {
  const steps = compound.steps;
  const [current, setCurrent] = useState(1);
  const done = useSyncExternalStore(
    subscribeSetupDone,
    getSetupDone,
    getSetupDoneServer,
  );
  const [copied, setCopied] = useState(false);

  const step = useMemo(
    () => steps.find((item) => item.id === current) ?? steps[0],
    [steps, current],
  );
  const archive = exploreHref(step);
  const isDone = done.includes(step.id);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(step.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const toggleDone = () => {
    writeSetupDone(
      done.includes(step.id)
        ? done.filter((id) => id !== step.id)
        : [...done, step.id].sort((a, b) => a - b),
    );
  };

  return (
    <>
      <SiteHeader active="setup" />
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
            12-step install
          </p>
          <p className="mt-2 text-xs text-mute">
            {done.length} of {steps.length} marked done. Stored only in this
            browser.
          </p>
          <ol className="mt-4 flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {steps.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setCurrent(item.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] ${
                    item.id === current
                      ? "bg-panel text-paper"
                      : "text-mute hover:text-paper"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] ${
                      done.includes(item.id)
                        ? "bg-brass text-ink"
                        : "ring-1 ring-line"
                    }`}
                  >
                    {done.includes(item.id) ? "✓" : item.id}
                  </span>
                  <span className="hidden truncate lg:inline">{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <StepCard
          step={step}
          isDone={isDone}
          copied={copied}
          archive={archive}
          onCopy={copyPrompt}
          onToggle={toggleDone}
          onPrev={() => setCurrent((id) => Math.max(1, id - 1))}
          onNext={() => setCurrent((id) => Math.min(12, id + 1))}
        />
      </div>
    </>
  );
}

function StepCard({
  step,
  isDone,
  copied,
  archive,
  onCopy,
  onToggle,
  onPrev,
  onNext,
}: {
  step: CompoundStep;
  isDone: boolean;
  copied: boolean;
  archive: string | null;
  onCopy: () => void;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <article className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
        Step {String(step.id).padStart(2, "0")} · {step.slug}
      </p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-paper">
        {step.title}
      </h1>
      <p className="mt-2 text-[15px] text-mute">{step.summary}</p>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-paper/90">
        {step.why}
      </p>
      <p className="mt-3 text-xs text-mute">
        Paste into: <span className="text-paper">{step.pasteInto}</span>
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mute">
            User prompt — copy exactly
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-full bg-brass/15 px-3 py-1 font-mono text-[11px] text-brass hover:bg-brass/25"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-paper">
          {step.prompt}
        </pre>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-4 py-2 text-sm ${
            isDone
              ? "bg-brass text-ink"
              : "border border-line text-paper hover:border-brass/40"
          }`}
        >
          {isDone ? "Done" : "Mark done"}
        </button>
        {archive ? (
          <Link
            href={archive}
            className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-paper"
          >
            Browse archive for this step
          </Link>
        ) : (
          <Link
            href="/explore"
            className="rounded-full border border-line px-4 py-2 text-sm text-mute hover:text-paper"
          >
            Pick a role from the archive
          </Link>
        )}
        <Link href="/kit" className="text-sm text-brass hover:underline">
          Open starter pack
        </Link>
      </div>

      <div className="mt-8 flex justify-between border-t border-line pt-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={step.id === 1}
          className="font-mono text-[11px] uppercase tracking-wider text-mute disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={step.id === 12}
          className="font-mono text-[11px] uppercase tracking-wider text-mute disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </article>
  );
}
