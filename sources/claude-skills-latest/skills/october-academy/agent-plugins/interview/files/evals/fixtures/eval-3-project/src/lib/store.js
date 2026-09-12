// 아직 JSDoc 없음 — parse.js 다음 차례.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DATA_PATH = process.env.DATA_PATH || "./data/metrics.json";

export async function readMetrics() {
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf8"));
  } catch {
    return [];
  }
}

export async function appendSnapshot(snapshot) {
  const metrics = await readMetrics();
  const idx = metrics.findIndex((m) => m.date === snapshot.date);
  if (idx >= 0) metrics[idx] = snapshot;
  else metrics.push(snapshot);
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(metrics, null, 2));
  return metrics.length;
}
