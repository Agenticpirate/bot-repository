"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Mic,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import {
  AGENT_STATES,
  DIALECT_META,
  MOTION_DIALECTS,
  STATE_COPY,
  type AgentState,
  type MotionDialect,
} from "@/lib/motion";
import { AgentAvatar } from "@/components/motion/AgentAvatar";
import { ApprovalCard } from "@/components/motion/ApprovalCard";
import { ThinkingMark, WorkingPulse } from "@/components/motion/ThinkingMark";
import { TypeGlyph } from "@/components/motion/TypeGlyph";
import { UiIcon } from "@/components/icons";

const ROSTER = [
  { name: "Memory Steward", id: "compound/memory-steward", state: "working" as const },
  { name: "Desk Captain", id: "compound/desk-captain", state: "idle" as const },
  { name: "Weekly Prune", id: "compound/weekly-prune", state: "thinking" as const },
  { name: "Who I Am", id: "compound/who-i-am", state: "waiting" as const },
  { name: "Archive Scout", id: "compound/archive-scout", state: "blocked" as const },
  { name: "Decision Clerk", id: "compound/decision-clerk", state: "done" as const },
];

const ICON_KIT = [
  { icon: Search, label: "Search" },
  { icon: Send, label: "Send" },
  { icon: Mic, label: "Mic" },
  { icon: Paperclip, label: "Attach" },
  { icon: Star, label: "Save" },
  { icon: Copy, label: "Copy" },
  { icon: Check, label: "Done" },
  { icon: ExternalLink, label: "Source" },
  { icon: Bot, label: "Bot" },
  { icon: Sparkles, label: "Skill" },
] as const;

const TYPE_SAMPLES = ["bot", "skill", "soul", "workflow", "team", "plugin"] as const;

export function MotionGallery() {
  const [dialect, setDialect] = useState<MotionDialect>("pebble");
  const [live, setLive] = useState<AgentState>("working");
  const meta = DIALECT_META[dialect];

  return (
    <div className="cmp-enter flex flex-col gap-14">
      <div className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Motion dialects"
          className="flex flex-wrap gap-1.5"
        >
          {MOTION_DIALECTS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={dialect === item}
              onClick={() => setDialect(item)}
              className={`cmp-cta rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ring-1 ${
                dialect === item
                  ? "bg-paper/10 text-paper ring-paper/30"
                  : "text-mute ring-line hover:text-paper"
              }`}
            >
              {DIALECT_META[item].tab}
            </button>
          ))}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-mute">{meta.blurb}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-brass">
          {meta.title} · inspired by {meta.inspired} · original Compound drawing
        </p>
      </div>

      <section aria-labelledby="live-face">
        <h2 id="live-face" className="font-display text-xl font-semibold text-paper">
          One face, six states
        </h2>
        <p className="mt-1 max-w-xl text-sm text-mute">
          Memory Steward keeps the same hashed accessory. Only the motion changes.
        </p>
        <div className="mt-5 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <AgentAvatar
            name="Memory Steward"
            id="compound/memory-steward"
            state={live}
            dialect={dialect}
            size="xl"
            showSnippet={dialect !== "outline"}
          />
          <div className="flex flex-wrap gap-1.5">
            {AGENT_STATES.map((state) => (
              <button
                key={state}
                type="button"
                aria-pressed={live === state}
                onClick={() => setLive(state)}
                className={`cmp-cta rounded-full px-2.5 py-1 font-mono text-[11px] ring-1 ${
                  live === state
                    ? "bg-brass/20 text-brass ring-brass/40"
                    : "text-mute ring-line hover:text-paper"
                }`}
              >
                {STATE_COPY[dialect][state].verb}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="state-grid">
        <h2 id="state-grid" className="font-display text-xl font-semibold text-paper">
          State grid
        </h2>
        <ul className="cmp-stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_STATES.map((state) => (
            <li
              key={state}
              className="flex items-center gap-3 rounded-2xl border border-line bg-panel/70 px-4 py-3"
            >
              <AgentAvatar
                name="Memory Steward"
                id="compound/memory-steward"
                state={state}
                dialect={dialect}
                size="md"
                showSnippet={false}
              />
              <div>
                <p className="text-sm font-medium text-paper">
                  {STATE_COPY[dialect][state].verb}
                </p>
                <p className="mt-0.5 text-xs text-mute">
                  {STATE_COPY[dialect][state].action}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="roster">
        <h2 id="roster" className="font-display text-xl font-semibold text-paper">
          Deterministic roster
        </h2>
        <p className="mt-1 max-w-xl text-sm text-mute">
          Accessory, tone, and eye shape come from a name/id hash — the same listing
          always gets the same pebble.
        </p>
        <ul className="cmp-stagger mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ROSTER.map((item) => (
            <li
              key={item.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel/70 px-3 py-4"
            >
              <AgentAvatar
                name={item.name}
                id={item.id}
                state={item.state}
                dialect={dialect}
                size="lg"
                showSnippet={dialect === "soft" || dialect === "mark"}
              />
              <p className="text-center text-xs font-medium text-paper">{item.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-mute">
                {item.state}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="marks">
        <h2 id="marks" className="font-display text-xl font-semibold text-paper">
          Thinking mark & working pulse
        </h2>
        <p className="mt-1 max-w-xl text-sm text-mute">
          Original Compound frames — asterisk-family geometry, not a vendor logo.
          The 2×3 lattice is a working pulse, optional beside the mark.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-8 rounded-2xl border border-line bg-panel/70 px-5 py-6">
          <div className="flex items-center gap-3 text-brass">
            <ThinkingMark size="md" label="Still working" />
            <span className="font-mono text-[12px] text-paper/90">Still working</span>
          </div>
          <div className="flex items-center gap-3 text-brass">
            <WorkingPulse />
            <span className="font-mono text-[12px] text-mute">Working pulse</span>
          </div>
          <AgentAvatar
            name="Archive Scout"
            id="compound/archive-scout"
            state="thinking"
            dialect="mark"
            size="md"
          />
        </div>
      </section>

      {dialect === "soft" || dialect === "pebble" ? (
        <section aria-labelledby="approval">
          <h2 id="approval" className="font-display text-xl font-semibold text-paper">
            Approval card
          </h2>
          <p className="mt-1 max-w-xl text-sm text-mute">
            Consequential steps stay visible: icon, label, two actions. Inspired by
            personal-agent approval UX — Compound chrome, not a brand reprint.
          </p>
          <div className="mt-5 max-w-md">
            <ApprovalCard
              title="Seat Memory Steward on the shared desk?"
              body="This writes the starter skill into your kit. It does not invent a thirteenth role or a new serial."
              primary="Seat it"
              secondary="Not now"
            />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="types">
        <h2 id="types" className="font-display text-xl font-semibold text-paper">
          Type marks
        </h2>
        <p className="mt-1 max-w-xl text-sm text-mute">
          Bot-like rows wear a pebble. Skills, souls, and workflows use outlined
          Lucide marks so the archive stays scannable.
        </p>
        <ul className="mt-5 flex flex-wrap gap-3">
          {TYPE_SAMPLES.map((type) => (
            <li
              key={type}
              className="flex items-center gap-2 rounded-2xl border border-line bg-panel/70 px-3 py-2"
            >
              <TypeGlyph type={type} size="sm" dialect={dialect} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-mute">
                {type}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="icons">
        <h2 id="icons" className="font-display text-xl font-semibold text-paper">
          Icon kit
        </h2>
        <p className="mt-1 max-w-xl text-sm text-mute">
          lucide-react, one stroke weight. Send / mic / paperclip sit next to
          archive verbs — search, save, copy, source.
        </p>
        <ul
          className={`mt-5 grid gap-2 sm:grid-cols-2 ${
            dialect === "outline" ? "lg:grid-cols-2" : "lg:grid-cols-5"
          }`}
        >
          {ICON_KIT.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-line bg-panel/70 px-3 py-2.5 text-paper"
            >
              <UiIcon icon={item.icon} size={18} className="text-paper" />
              <span className="text-sm">{item.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
