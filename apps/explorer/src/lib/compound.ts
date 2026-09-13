import prompts from "../../content/compound/prompts.json";

export type CompoundStep = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  why: string;
  pasteInto: string;
  archiveQuery: string;
  exploreType?: string;
  prompt: string;
};

export type CompoundPrompts = {
  product: string;
  tagline: string;
  version: string;
  attribution: {
    inspiredBy: string;
    url: string;
    handle: string;
    note: string;
  };
  steps: CompoundStep[];
};

export const compound = prompts as CompoundPrompts;

export const MEMORY_LAWS = [
  {
    title: "Shared vs private",
    body: "Company truth is shared. Task scratch is private. Mixed piles are how two bots disagree about you.",
  },
  {
    title: "Who I Am",
    body: "A short profile every bot reads first: goals, standards, voice, hard nos. Under 400 words.",
  },
  {
    title: "Named skills",
    body: "Reusable teaching gets a name and a file. Chat scraps are not a company.",
  },
  {
    title: "Decisions log",
    body: "What you chose and why. Bots read it. They do not reopen a locked call without a flag.",
  },
  {
    title: "Corrections as rules",
    body: "always X, never Y — applied across every bot, not just the one you scolded.",
  },
  {
    title: "Draft first",
    body: "Send, post, or spend waits for you. The edit is the lesson; save why you changed it.",
  },
  {
    title: "Weekly prune",
    body: "Learned / promote / stale. You keep the delete key.",
  },
  {
    title: "Standing goal",
    body: "Cleanliness is a /goal, not a mood. Drift dies the moment you name it.",
  },
] as const;

export const SETUP_STORAGE_KEY = "compound-setup-done";

type DoneListener = () => void;
const doneListeners = new Set<DoneListener>();

function readDone(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SETUP_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => n >= 1 && n <= 12) : [];
  } catch {
    return [];
  }
}

export function subscribeSetupDone(listener: DoneListener): () => void {
  doneListeners.add(listener);
  return () => doneListeners.delete(listener);
}

export function getSetupDone(): number[] {
  return readDone();
}

export function getSetupDoneServer(): number[] {
  return [];
}

export function writeSetupDone(next: number[]): void {
  localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(next));
  for (const listener of doneListeners) listener();
}

export function exploreHref(step: CompoundStep): string | null {
  const params = new URLSearchParams();
  if (step.archiveQuery) params.set("q", step.archiveQuery);
  if (step.exploreType) params.set("type", step.exploreType);
  if (![...params.keys()].length) return null;
  return `/explore?${params.toString()}`;
}
