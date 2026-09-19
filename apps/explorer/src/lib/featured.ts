import type { IndexDoc } from "./types";

export type FeaturedShelf = {
  id: string;
  title: string;
  source: string;
  blurb: string;
};

/** Curated shelves — source keys must exist in the committed seed. */
export const FEATURED_SHELVES: readonly FeaturedShelf[] = [
  {
    id: "xai",
    title: "Official xAI marketplace",
    source: "x.ai/bot/marketplace",
    blurb: "Published Grok bots from the x.ai marketplace.",
  },
  {
    id: "templates",
    title: "grokbot-templates.com",
    source: "grokbot-templates.com",
    blurb: "Community Grok bot templates mirrored from the public directory.",
  },
  {
    id: "skills",
    title: "skills.sh",
    source: "skills.sh",
    blurb: "Published agent skills with original source URLs.",
  },
];

const PREFERRED_TYPES = new Set([
  "bot",
  "skill",
  "soul",
  "template",
  "workflow",
  "team",
  "agent",
  "plugin",
]);

function shelfScore(doc: IndexDoc): number {
  if (/catalog cap/i.test(doc.name)) return -20;
  if (doc.type === "page" && /directory|index|home/i.test(doc.name)) return -8;
  if (PREFERRED_TYPES.has(doc.type)) return 6;
  if (doc.description) return 2;
  return 0;
}

export function docsForShelf(docs: IndexDoc[], source: string, limit = 4): IndexDoc[] {
  return docs
    .filter((doc) => doc.source === source)
    .sort((a, b) => shelfScore(b) - shelfScore(a))
    .slice(0, limit);
}
