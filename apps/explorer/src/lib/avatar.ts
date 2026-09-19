export const ACCESSORIES = [
  "sprout",
  "antenna",
  "crescent",
  "spark",
  "ring",
  "bar",
  "notch",
  "dots",
] as const;

export type Accessory = (typeof ACCESSORIES)[number];

export const EYE_SHAPES = ["round", "oval", "wide"] as const;
export type EyeShape = (typeof EYE_SHAPES)[number];

/** Dark Compound fills — not a rainbow identicon. */
export const PEBBLE_TONES = [
  "#1c2230",
  "#2a261c",
  "#1a2622",
  "#261c28",
  "#1e2428",
  "#2c2218",
  "#18242c",
  "#281c1c",
] as const;

export const PEBBLE_ACCENTS = [
  "#d4a054",
  "#eee8dc",
  "#6ee7b7",
  "#a78bfa",
] as const;

export type AvatarIdentity = {
  seed: number;
  accessory: Accessory;
  eye: EyeShape;
  tone: string;
  accent: string;
};

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function identityFrom(name: string, id?: string): AvatarIdentity {
  const seed = hashSeed(id && id.length > 0 ? id : name);
  return {
    seed,
    accessory: ACCESSORIES[seed % ACCESSORIES.length],
    eye: EYE_SHAPES[(seed >>> 3) % EYE_SHAPES.length],
    tone: PEBBLE_TONES[(seed >>> 6) % PEBBLE_TONES.length],
    accent: PEBBLE_ACCENTS[(seed >>> 9) % PEBBLE_ACCENTS.length],
  };
}
