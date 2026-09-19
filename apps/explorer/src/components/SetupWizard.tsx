"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CopyButton } from "./CopyButton";

function clampStep(value: string | null): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 12) return 1;
  return n;
}

export function SetupWizard() {
  const steps = compound.steps;
  const params = useSearchParams();
  const router = useRouter();
  const current = clampStep(params.get("step"));
  const done = useSyncExternalStore(
    subscribeSetupDone,
    getSetupDone,
    getSetupDoneServer,
  );

  const setCurrent = (id: number) => {
    const next = Math.min(12, Math.max(1, id));
    const search = new URLSearchParams(params.toString());
    search.set("step", String(next));
    router.replace(`/setup?${search.toString()}`, { scroll: false });
  };

  const step = useMemo(
    () => steps.find((item) => item.id === current) ?? steps[0],
    [steps, current],
  );
  const archive = exploreHref(step);
  const isDone = done.includes(step.id);
  const complete = done.length === steps.length;
  const progress = Math.round((done.length / steps.length) * 100);

  const toggleDone = () => {
    writeSetupDone(
      done.includes(step.id)
        ? done.filter((id) => id !== step.id)
        : [...done, step.id].sort((a, b) => a - b),
    );
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
          12-step install
        </p>
        <p className="mt-2 text-xs text-mute">
          {done.length} of {steps.length} marked done. Stored only in this
          browser.
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done.length}
          aria-label="Setup progress"
        >
          <div
            className="h-full bg-brass transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="mt-4 flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {steps.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setCurrent(item.id)}
                aria-current={item.id === current ? "step" : undefined}
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

      <div className="min-w-0">
        {complete ? <DoneBanner /> : null}
        <StepCard
          step={step}
          isDone={isDone}
          archive={archive}
          onToggle={toggleDone}
          onPrev={() => setCurrent(step.id - 1)}
          onNext={() => setCurrent(step.id + 1)}
        />
      </div>
    </div>
  );
}

function DoneBanner() {
  return (
    <div className="mb-8 rounded-2xl border border-brass/30 bg-brass/10 px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
        Done in this browser
      </p>
      <h2 className="font-display mt-1 text-2xl font-semibold text-paper">
        Twelve steps marked. The OS is installed here.
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
        Progress never left this machine. Next: lock the starter files, then
        seat real bots from the archive — do not invent a thirteenth role.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/kit"
          className="rounded-full bg-brass px-4 py-2 text-sm font-medium text-ink hover:bg-brass/90"
        >
          Open starter pack
        </Link>
        <Link
          href="/explore"
          className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-brass/40"
        >
          Pick from the archive
        </Link>
      </div>
    </div>
  );
}

function StepCard({
  step,
  isDone,
  archive,
  onToggle,
  onPrev,
  onNext,
}: {
  step: CompoundStep;
  isDone: boolean;
  archive: string | null;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState(false);

  return (
    <article className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
        Step {String(step.id).padStart(2, "0")} of 12 · {step.slug}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mute">
            User prompt — copy exactly
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const range = document.createRange();
                const node = document.getElementById(`prompt-${step.id}`);
                if (!node) return;
                range.selectNodeContents(node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                setSelected(true);
                window.setTimeout(() => setSelected(false), 1200);
              }}
              className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-mute hover:text-paper"
            >
              {selected ? "Selected" : "Select"}
            </button>
            <CopyButton text={step.prompt} label="Copy prompt" />
          </div>
        </div>
        <pre
          id={`prompt-${step.id}`}
          className="whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-paper"
        >
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
        {step.id === 12 ? (
          <Link
            href="/kit"
            className="font-mono text-[11px] uppercase tracking-wider text-brass"
          >
            Next: starter pack →
          </Link>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="font-mono text-[11px] uppercase tracking-wider text-mute"
          >
            Next →
          </button>
        )}
      </div>
    </article>
  );
}
