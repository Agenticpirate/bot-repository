const SAVED_STORAGE_KEY = "compound-saved";

type Listener = () => void;
const listeners = new Set<Listener>();
const EMPTY: string[] = [];
let cachedRaw: string | null = null;
let cachedIds: string[] = EMPTY;

function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    return ids.length === 0 ? EMPTY : [...new Set(ids)];
  } catch {
    return EMPTY;
  }
}

function readIds(): string[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(SAVED_STORAGE_KEY) ?? "[]";
  if (raw === cachedRaw) return cachedIds;
  const next = parseIds(raw);
  cachedRaw = raw;
  cachedIds = next;
  return cachedIds;
}

function writeIds(next: string[]): void {
  const unique = [...new Set(next)];
  const raw = JSON.stringify(unique);
  localStorage.setItem(SAVED_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedIds = unique.length === 0 ? EMPTY : unique;
  for (const listener of listeners) listener();
}

export function subscribeSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSavedIds(): string[] {
  return readIds();
}

export function getSavedIdsServer(): string[] {
  return EMPTY;
}

export function isSaved(id: string): boolean {
  return readIds().includes(id);
}

export function toggleSaved(id: string): boolean {
  const current = readIds();
  const exists = current.includes(id);
  writeIds(exists ? current.filter((item) => item !== id) : [...current, id]);
  return !exists;
}

export function clearSaved(): void {
  writeIds([]);
}
