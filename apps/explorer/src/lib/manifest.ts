import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IndexManifest } from "./types";

export async function readManifest(): Promise<IndexManifest> {
  const raw = await readFile(
    path.join(process.cwd(), "public/index/manifest.json"),
    "utf8",
  );
  return JSON.parse(raw) as IndexManifest;
}
