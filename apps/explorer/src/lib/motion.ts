export type AgentState =
  | "idle"
  | "thinking"
  | "working"
  | "waiting"
  | "blocked"
  | "done";

/** One Compound system, four inspired dialects — not four skins. */
export type MotionDialect = "pebble" | "soft" | "mark" | "outline";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export const AGENT_STATES: readonly AgentState[] = [
  "idle",
  "thinking",
  "working",
  "waiting",
  "blocked",
  "done",
];

export const MOTION_DIALECTS: readonly MotionDialect[] = [
  "pebble",
  "soft",
  "mark",
  "outline",
];

export const DIALECT_META: Record<
  MotionDialect,
  { tab: string; title: string; inspired: string; blurb: string }
> = {
  pebble: {
    tab: "Grok-like",
    title: "Pebble",
    inspired: "Grok Bot identity + state motion",
    blurb:
      "A persistent face. Simple pebble, expressive eyes, a hashed accessory. Motion carries idle → done so a second badge is not required. Hover reveals the current action.",
  },
  soft: {
    tab: "Muse-like",
    title: "Soft",
    inspired: "Muse activity snippet + approval cards",
    blurb:
      "Same pebble, quieter motion. An activity line sits under the face. Consequential steps use an approval card — accept or decline, nothing hidden.",
  },
  mark: {
    tab: "Claude-like",
    title: "Mark",
    inspired: "Claude Code thinking glyph + warm verbs",
    blurb:
      "Asterisk-family Compound marks cycle while work is in flight. Microcopy stays warm and honest: still working, not a spinner for its own sake.",
  },
  outline: {
    tab: "GPT-like",
    title: "Outline",
    inspired: "ChatGPT Apps SDK icon + card language",
    blurb:
      "Monochrome outlined marks, system colors, icon + label rows. Composer-like controls scale and fade a few percent — nothing theatrical.",
  },
};

export const STATE_COPY: Record<
  MotionDialect,
  Record<AgentState, { verb: string; action: string }>
> = {
  pebble: {
    idle: { verb: "Idle", action: "Calm, slightly curious" },
    thinking: { verb: "Thinking", action: "Turning the task over" },
    working: { verb: "Working", action: "Computer active" },
    waiting: { verb: "Waiting", action: "Paused — needs you" },
    blocked: { verb: "Blocked", action: "Needs a decision" },
    done: { verb: "Done", action: "Settled — ready" },
  },
  soft: {
    idle: { verb: "With you", action: "Here if you need me" },
    thinking: { verb: "Looking this over", action: "Reading what you asked" },
    working: { verb: "On it", action: "Working in the background" },
    waiting: { verb: "Paused for you", action: "Ready when you are" },
    blocked: { verb: "Needs a nod", action: "Waiting on approval" },
    done: { verb: "Finished", action: "Left a note for you" },
  },
  mark: {
    idle: { verb: "Ready", action: "Standing by" },
    thinking: { verb: "Thinking", action: "Still working this through" },
    working: { verb: "Working", action: "Still working" },
    waiting: { verb: "Waiting", action: "Holding for input" },
    blocked: { verb: "Blocked", action: "Cannot continue" },
    done: { verb: "Done", action: "Thought, then finished" },
  },
  outline: {
    idle: { verb: "Idle", action: "Idle" },
    thinking: { verb: "Thinking", action: "Thinking" },
    working: { verb: "Running", action: "Running" },
    waiting: { verb: "Waiting", action: "Waiting" },
    blocked: { verb: "Blocked", action: "Blocked" },
    done: { verb: "Complete", action: "Complete" },
  },
};

const BOT_LIKE = new Set(["bot", "agent", "team", "template"]);

export function isBotLike(type: string): boolean {
  return BOT_LIKE.has(type);
}

export function listingAction(doc: { type: string; source: string }): string {
  switch (doc.type) {
    case "bot":
    case "agent":
      return "Standing by in the archive";
    case "team":
      return "A seat of roles, idle";
    case "template":
      return "Template at rest";
    default:
      return `From ${doc.source}`;
  }
}

export const AVATAR_PX: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 64,
  xl: 88,
};
