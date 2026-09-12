/**
 * 결제 웹훅 payload를 일일 스냅샷으로 변환.
 * JSDoc 타입 주석을 붙이는 중 — jsconfig.json의 checkJs가 src/lib만 검사한다.
 *
 * @typedef {object} Snapshot
 * @property {string} date - ISO 날짜 (YYYY-MM-DD)
 * @property {number} mrr - 월 반복 매출 (KRW)
 * @property {number} activeSubs - 활성 구독 수
 */

/**
 * @param {string} raw - 웹훅 원문 JSON
 * @returns {Snapshot | null}
 */
export function parseWebhook(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data.mrr !== "number" || typeof data.activeSubs !== "number") {
    return null;
  }
  return {
    date: (data.occurredAt || new Date().toISOString()).slice(0, 10),
    mrr: data.mrr,
    activeSubs: data.activeSubs,
  };
}

/**
 * @param {Snapshot[]} snapshots
 * @returns {number} 최근 30일 MRR 변화율 (소수)
 */
export function growthRate(snapshots) {
  if (snapshots.length < 2) return 0;
  const first = snapshots[0].mrr || 1;
  const last = snapshots[snapshots.length - 1].mrr;
  return (last - first) / first;
}
