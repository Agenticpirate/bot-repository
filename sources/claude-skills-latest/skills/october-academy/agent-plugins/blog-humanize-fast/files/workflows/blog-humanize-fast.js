export const meta = {
  name: 'blog-humanize-fast',
  description: '병렬 strict 윤문 — 청크 병렬 탐지+윤문 융합 → 청크 fidelity(재시도 1회 후 롤백) → 전역 naturalness·잔존 탐지 병렬 → 표적 수정 1라운드(fidelity 게이트)',
  whenToUse: '블로그 최종 윤문 엔진. args: { inputPath(권장 — frontmatter 제외 본문 파일 경로) 또는 text(짧은 본문만), genre(기본 블로그), intensity(기본 보수), quickRulesPath(필수 — 플러그인 번들 quick-rules.md) }.',
  phases: [
    { title: 'Rewrite', detail: '청크 병렬 탐지+윤문 융합 + 청크별 fidelity·변경률 게이트' },
    { title: 'GlobalReview', detail: '전역 naturalness + 잔존 S1/S2 탐지 (병렬)' },
    { title: 'TargetedFix', detail: '지적 span만 표적 수정 1라운드 + fidelity 게이트' },
  ],
}

// ===== PURE-TESTABLE-BEGIN =====
// 아래 순수 함수들은 워크플로 런타임 전역(agent/log 등)에 의존하지 않는다.
// /tmp/bhf-test.mjs 가 이 마커 구간을 추출·eval 해 단위 테스트한다. 이 구간에
// agent()/log()/args 등 런타임 심볼을 넣지 마라 — 순수성이 깨지면 테스트가 못 돈다.
function isBlankLine(line) {
  return line.trim() === ''
}

function fenceOpen(line) {
  const m = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(line)
  if (!m) return null
  const marker = m[2]
  return { char: marker[0], len: marker.length }
}

function fenceClose(line, open) {
  const m = /^(\s*)(`{3,}|~{3,})[ \t]*$/.exec(line)
  if (!m) return false
  const marker = m[2]
  return marker[0] === open.char && marker.length >= open.len
}

function detectFrontmatterEnd(lines) {
  if (!/^---[ \t]*$/.test(lines[0] || '')) return -1
  for (let i = 1; i < lines.length; i++) {
    if (/^(---|\.\.\.)[ \t]*$/.test(lines[i])) return i
  }
  return -1
}

// text 를 원본 개행까지 손실 없이 보존하는 세그먼트 파티션으로 나눈다.
// 불변식: segments.map(s => s.text).join('\n') === text (연속 line-range 파티션).
// role: 'prot'(frontmatter·fence·indented code, byte-identical 보존, 윤문 안 함)
//       'blank'(빈 줄 구분자, verbatim)
//       'prose'(윤문 대상). id 는 prot·prose 에만 순서대로 부여.
function buildSegments(text) {
  const lines = text.split('\n')
  const N = lines.length
  const segs = []
  let i = 0

  const fmEnd = detectFrontmatterEnd(lines)
  if (fmEnd >= 0) {
    segs.push({ role: 'prot', kind: 'frontmatter', text: lines.slice(0, fmEnd + 1).join('\n') })
    i = fmEnd + 1
  }

  while (i < N) {
    const open = fenceOpen(lines[i])
    if (open) {
      let j = i + 1
      let closed = false
      while (j < N) {
        if (fenceClose(lines[j], open)) { closed = true; break }
        j++
      }
      const end = closed ? j : N - 1
      segs.push({ role: 'prot', kind: 'fence', text: lines.slice(i, end + 1).join('\n') })
      i = end + 1
      continue
    }
    if (isBlankLine(lines[i])) {
      let j = i
      while (j < N && isBlankLine(lines[j])) j++
      segs.push({ role: 'blank', text: lines.slice(i, j).join('\n') })
      i = j
      continue
    }
    // 내용 런(non-blank, non-fence) — 다음 빈 줄이나 펜스 전까지.
    let j = i
    while (j < N && !isBlankLine(lines[j]) && !fenceOpen(lines[j])) j++
    const runLines = lines.slice(i, j)
    const allIndented = runLines.every((l) => /^ {4,}/.test(l) || /^\t/.test(l))
    segs.push({
      role: allIndented ? 'prot' : 'prose',
      kind: allIndented ? 'indented-code' : 'prose',
      text: runLines.join('\n'),
    })
    i = j
  }

  let id = 0
  for (const s of segs) {
    if (s.role === 'prot' || s.role === 'prose') s.id = id++
  }
  return segs
}

// finalById: { [proseSegId]: rewrittenText }. 없으면 원문 유지.
// prot·blank 는 항상 원문 그대로 → 아무것도 안 바뀌면 결과 === text.
function assembleSegments(segs, finalById) {
  return segs
    .map((s) => {
      if (s.role === 'prose') {
        const f = finalById[s.id]
        return typeof f === 'string' ? f : s.text
      }
      return s.text
    })
    .join('\n')
}

// 공통 prefix/suffix 를 제외한 중간부 변경 규모로 변경률을 근사한다.
// rate = max(변경된 원문 문자수, 변경된 산출 문자수) / max(원문 길이, 1).
function diffStats(a, b) {
  const la = a.length
  const lb = b.length
  if (a === b) return { changedOrig: 0, changedNew: 0, origLen: la, rate: 0 }
  const min = Math.min(la, lb)
  let p = 0
  while (p < min && a.charCodeAt(p) === b.charCodeAt(p)) p++
  let s = 0
  while (s < min - p && a.charCodeAt(la - 1 - s) === b.charCodeAt(lb - 1 - s)) s++
  const changedOrig = la - p - s
  const changedNew = lb - p - s
  const rate = Math.max(changedOrig, changedNew) / Math.max(la, 1)
  return { changedOrig, changedNew, origLen: la, rate }
}

// Read 로 받은 text 길이와 wc -m charCount 가 ±2%(최소 4자 슬랙) 이내인지.
function withinTolerance(len, charCount) {
  const tol = Math.max(charCount * 0.02, 4)
  return Math.abs(len - charCount) <= tol
}
// ===== PURE-TESTABLE-END =====

let A = args
if (typeof A === 'string') {
  try { A = JSON.parse(A) } catch (e) { A = null }
}
if (A && typeof A === 'object' && A.args && !A.inputPath && !A.text) A = A.args
if (!A || typeof A !== 'object') A = {}
log(`args 진단: typeof=${typeof args}, keys=[${Object.keys(A).join(',')}], raw=${JSON.stringify(args).slice(0, 120)}`)

if (!A.quickRulesPath || typeof A.quickRulesPath !== 'string') {
  throw new Error('args.quickRulesPath 필요 — 플러그인 스킬은 {SKILL_DIR}/references/quick-rules.md를 전달해야 한다')
}
const QUICK_RULES = A.quickRulesPath
const genre = A.genre || '블로그'
const intensity = A.intensity || '보수'

const READ_SCHEMA = {
  type: 'object',
  required: ['text', 'charCount'],
  properties: { text: { type: 'string' }, charCount: { type: 'number' } },
}

// 시작 시 룰북(quick-rules)과 입력 본문을 haiku 로 1회씩 로드한다.
// 각 Read 는 wc -m charCount 와 ±2% 대조로 잘림·변형을 잡는다.
// 룰북은 이후 각 서브콜에 인라인해 청크마다의 파일 Read 왕복을 없앤다.
let text = typeof A.text === 'string' && A.text.length ? A.text : null
const needInput = !text && !!A.inputPath

const readRulesPrompt = `${QUICK_RULES} 파일을 Read 도구로 읽어라. 그리고 Bash 도구로 정확히 \`LC_ALL=en_US.UTF-8 wc -m < "${QUICK_RULES}"\` 를 실행해 문자 수를 얻어라(LC_ALL 고정 필수 — POSIX 로케일의 wc -m은 바이트를 세어 한국어 문서 대조가 항상 깨진다). 반환: text(파일 내용 전체를 한 글자도 바꾸지 말고 그대로), charCount(wc -m 출력의 정수). 요약·정리·수정 금지.`
const readInputPrompt = A.inputPath
  ? `${A.inputPath} 파일을 Read 도구로 읽어라. 그리고 Bash 도구로 정확히 \`LC_ALL=en_US.UTF-8 wc -m < "${A.inputPath}"\` 를 실행해 문자 수를 얻어라(LC_ALL 고정 필수 — POSIX 로케일의 wc -m은 바이트를 세어 한국어 문서 대조가 항상 깨진다). 반환: text(파일 내용 전체를 한 글자도 바꾸지 말고 그대로), charCount(wc -m 출력의 정수). 요약·정리·수정 금지.`
  : null

const readThunks = [() => agent(readRulesPrompt, { label: 'read-rules', model: 'haiku', schema: READ_SCHEMA })]
if (needInput) readThunks.push(() => agent(readInputPrompt, { label: 'read-input', model: 'haiku', schema: READ_SCHEMA }))
const loaded = await parallel(readThunks)

const rulesLoaded = loaded[0]
if (!rulesLoaded || typeof rulesLoaded.text !== 'string' || !rulesLoaded.text.length) {
  throw new Error('read-rules 실패 — quick-rules.md 를 로드하지 못했다')
}
if (!withinTolerance(rulesLoaded.text.length, rulesLoaded.charCount)) {
  throw new Error(`read-rules 무결성 실패: 반환 text ${rulesLoaded.text.length}자 vs wc -m ${rulesLoaded.charCount}자 (±2% 초과) — 룰북 읽기가 잘렸거나 변형됐다`)
}
const RULES = rulesLoaded.text

if (needInput) {
  const inputLoaded = loaded[1]
  if (!inputLoaded || typeof inputLoaded.text !== 'string') {
    throw new Error(`read-input 실패 — ${A.inputPath} 를 로드하지 못했다`)
  }
  if (!withinTolerance(inputLoaded.text.length, inputLoaded.charCount)) {
    throw new Error(`read-input 무결성 실패: 반환 text ${inputLoaded.text.length}자 vs wc -m ${inputLoaded.charCount}자 (±2% 초과) — 파일 읽기가 잘렸거나 변형됐다`)
  }
  text = inputLoaded.text
}
if (!text || typeof text !== 'string') {
  throw new Error(`args.inputPath(파일 경로) 또는 args.text 필요 — 도착한 args: ${JSON.stringify(args).slice(0, 200)}`)
}

const RULEBOOK = `아래 룰북(quick-rules)을 판단 기준으로 삼아라. 다른 파일은 읽지 마라.
<<<RULES
${RULES}
RULES>>>`

const segments = buildSegments(text)
// 무결성 게이트: 무변경 재조립이 원문과 byte-identical 이어야 한다(파티션 손실 없음 확인).
if (assembleSegments(segments, {}) !== text) {
  log('무결성 경고: 세그먼트 분할이 원문과 불일치 — 파티션 버그 가능성, 결과 검토 필요')
}
const proseChunks = segments.filter((s) => s.role === 'prose')
const origById = {}
for (const s of segments) if (s.role === 'prose') origById[s.id] = s.text
log(`세그먼트 ${segments.length}개 — 프로즈 ${proseChunks.length}, 보호 ${segments.filter((s) => s.role === 'prot').length}, 빈줄 ${segments.filter((s) => s.role === 'blank').length}, 입력 ${text.length}자`)

const DO_NOT = `절대 건드리지 않는다(Do-NOT): 수치·날짜·금액, 고유명사·제품명, 직접 인용(따옴표 안), 코드·인라인 코드, URL·링크 텍스트의 목적지, 마크다운 구조(헤더 레벨·리스트·표), JSX 컴포넌트 태그와 속성(<Callout> 등 — 태그 안 한국어 산문만 윤문 가능), 영어 기술 용어 표기. 격식(register)과 장르(${genre})를 보존한다. 내용·주장·논리 순서는 한 글자 수준에서 불변 — 문체·리듬·표현만 바꾼다.`

const REWRITE_SCHEMA = {
  type: 'object', required: ['rewritten', 'changes'],
  properties: {
    rewritten: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', required: ['before', 'after', 'category'], properties: { before: { type: 'string' }, after: { type: 'string' }, category: { type: 'string' }, severity: { type: 'string' } } } },
  },
}
const FIDELITY_SCHEMA = {
  type: 'object', required: ['pass', 'violations'],
  properties: { pass: { type: 'boolean' }, violations: { type: 'array', items: { type: 'string' } } },
}

function rewritePrompt(chunkBody) {
  return `${RULEBOOK}

아래 한국어 블로그 본문 조각에서 AI 티 패턴(S1·S2 중심)을 탐지해 윤문하라. 강도: ${intensity} — 확신 없는 구간은 그대로 둔다. ${DO_NOT}

윤문 대상 조각(마크다운, 문서의 일부이므로 앞뒤 문맥 가정 금지·조각 경계 밖 언급 금지):
<<<CHUNK
${chunkBody}
CHUNK>>>

rewritten에는 조각 전체(무변경 부분 포함)를 넣고, changes에는 실제 바꾼 지점만 before/after/category(taxonomy 카테고리)/severity로 나열하라. 바꿀 것이 없으면 rewritten=원문 그대로, changes=[].`
}

function fidelityPrompt(orig, rewritten) {
  return `한국어 윤문 전후의 의미 동등성을 감사하라. 사실·주장·수치·고유명사·인용·논리 순서·마크다운/JSX 구조가 하나라도 훼손됐으면 pass=false로 하고 violations에 훼손 지점을 구체적으로 나열하라. 문체·어순·리듬 변화는 위반이 아니다.

원문:
<<<A
${orig}
A>>>

윤문본:
<<<B
${rewritten}
B>>>`
}

phase('Rewrite')
const results = await pipeline(
  proseChunks,
  (c) => agent(rewritePrompt(c.text), { label: `rewrite:${c.id}`, phase: 'Rewrite', model: 'sonnet', effort: 'high', schema: REWRITE_SCHEMA }),
  async (r, c) => {
    if (!r) return { id: c.id, final: c.text, status: 'agent-null-rollback', changes: 0 }
    if (!r.changes.length) return { id: c.id, final: c.text, status: 'unchanged', changes: 0 }
    const v = await agent(fidelityPrompt(c.text, r.rewritten), { label: `fidelity:${c.id}`, phase: 'Rewrite', model: 'sonnet', schema: FIDELITY_SCHEMA })
    if (v && v.pass) {
      const d = diffStats(c.text, r.rewritten)
      if (d.rate > 0.5) {
        log(`청크 ${c.id} 변경률 ${(d.rate * 100).toFixed(0)}% > 50% — 롤백`)
        return { id: c.id, final: c.text, status: 'changerate-rollback', changes: r.changes.length, rate: d.rate }
      }
      return { id: c.id, final: r.rewritten, status: 'pass', changes: r.changes.length }
    }
    const r2 = await agent(
      rewritePrompt(c.text) + `\n\n1차 윤문이 의미 훼손으로 반려됐다. 반려 사유를 피해서 더 보수적으로 다시 윤문하라: ${JSON.stringify(v ? v.violations : ['agent error'])}`,
      { label: `rewrite2:${c.id}`, phase: 'Rewrite', model: 'opus', effort: 'high', schema: REWRITE_SCHEMA },
    )
    if (r2 && r2.changes.length) {
      const v2 = await agent(fidelityPrompt(c.text, r2.rewritten), { label: `fidelity2:${c.id}`, phase: 'Rewrite', model: 'sonnet', schema: FIDELITY_SCHEMA })
      if (v2 && v2.pass) {
        const d2 = diffStats(c.text, r2.rewritten)
        if (d2.rate > 0.5) {
          log(`청크 ${c.id} 재시도 변경률 ${(d2.rate * 100).toFixed(0)}% > 50% — 롤백`)
          return { id: c.id, final: c.text, status: 'changerate-rollback', changes: r2.changes.length, rate: d2.rate }
        }
        return { id: c.id, final: r2.rewritten, status: 'retry-pass', changes: r2.changes.length }
      }
    }
    return { id: c.id, final: c.text, status: 'rollback', changes: 0, violations: v ? v.violations : [] }
  },
)

// 순서 보장: 입력 순서에 의존하지 않고 id로 정렬해 조립·집계한다.
const ordered = results.filter(Boolean).slice().sort((a, b) => a.id - b.id)
const finalById = {}
for (const r of ordered) finalById[r.id] = r.final
const assembled = assembleSegments(segments, finalById)

// 무결성 게이트: 보호 청크는 재조립본에 byte-identical 로 존재해야 한다.
for (const s of segments) {
  if (s.role === 'prot' && !assembled.includes(s.text)) {
    log(`무결성 경고: 보호 청크 id=${s.id}(${s.kind})가 재조립본에서 변형됨`)
  }
}

// 전체 변경률(원문 대비): 30% 초과면 과윤문 경고.
let totOrig = 0
let totChg = 0
for (const r of ordered) {
  const d = diffStats(origById[r.id], r.final)
  totOrig += d.origLen
  totChg += d.changedOrig
}
const overallChangeRate = totOrig ? totChg / totOrig : 0
if (overallChangeRate > 0.3) {
  log(`경고: 전체 변경률 ${(overallChangeRate * 100).toFixed(1)}% > 30% — 과윤문 여부 검토 권장`)
}

phase('GlobalReview')
const NAT_SCHEMA = {
  type: 'object', required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['accept', 'fix'] },
    findings: { type: 'array', items: { type: 'object', required: ['quote', 'issue'], properties: { quote: { type: 'string' }, issue: { type: 'string' }, suggestion: { type: 'string' } } } },
  },
}
const RESID_SCHEMA = {
  type: 'object', required: ['items'],
  properties: { items: { type: 'array', items: { type: 'object', required: ['quote', 'pattern', 'severity'], properties: { quote: { type: 'string' }, pattern: { type: 'string' }, severity: { type: 'string', enum: ['S1', 'S2', 'S3'] } } } } },
}
const [nat, resid] = await parallel([
  () => agent(
    `${RULEBOOK}\n\n아래 윤문 완료본을 청크 경계를 넘는 전역 속성만 심사하라: 문장 리듬 균일성, 문두 표현 반복, 접속사 분포, 과윤문(부자연스러운 문학체·원문보다 어색해진 곳), 격식 일관성. 지역 패턴 재탐지는 하지 마라(별도 축이 한다). 고칠 곳이 있으면 verdict=fix로 findings(quote는 본문에서 정확히 복사)를 나열하라.\n\n<<<DOC\n${assembled}\nDOC>>>`,
    { label: 'global-naturalness', phase: 'GlobalReview', model: 'opus', effort: 'high', schema: NAT_SCHEMA },
  ),
  () => agent(
    `${RULEBOOK}\n\n아래 본문에서 잔존 AI 티 패턴을 스캔해 S1/S2만 items로 보고하라(S3는 제외). quote는 본문에서 정확히 복사.\n\n<<<DOC\n${assembled}\nDOC>>>`,
    { label: 'residual-detect', phase: 'GlobalReview', model: 'sonnet', effort: 'high', schema: RESID_SCHEMA },
  ),
])

phase('TargetedFix')
const findings = [
  ...((nat && nat.verdict === 'fix') ? nat.findings : []),
  ...((resid ? resid.items : []).filter((i) => i.severity !== 'S3').map((i) => ({ quote: i.quote, issue: i.pattern, suggestion: '' }))),
]
let finalText = assembled
let fixedCount = 0
if (findings.length) {
  const capped = findings.slice(0, 20)
  if (findings.length > 20) log(`표적 수정 상한 20건 — ${findings.length - 20}건은 리포트로만 남김`)
  const fx = await agent(
    `아래 본문에서 나열된 지적 span만 수정하라 — 다른 부분은 한 글자도 바꾸지 마라. ${DO_NOT}\n\n지적 목록:\n${JSON.stringify(capped, null, 2)}\n\n<<<DOC\n${finalText}\nDOC>>>\n\nfixed에 본문 전체(수정 반영본)를 넣어라.`,
    { label: 'targeted-fix', phase: 'TargetedFix', model: 'opus', effort: 'high', schema: { type: 'object', required: ['fixed'], properties: { fixed: { type: 'string' } } } },
  )
  if (!fx || !fx.fixed) {
    log('표적 수정 실패(agent null 또는 fixed 누락) — 수정 전 본문 유지')
  } else if (!(fx.fixed.length > finalText.length * 0.8)) {
    // 길이 휴리스틱 보조 가드: 급감이면 fidelity 감사 없이 반려.
    log('표적 수정 산출물 길이 급감(<0.8×) — 수정 전 본문 유지')
  } else {
    // fidelity 게이트: 수정본을 원문(수정 전 assembled) 대비 감사해 pass 일 때만 채택.
    const fv = await agent(fidelityPrompt(finalText, fx.fixed), { label: 'targeted-fidelity', phase: 'TargetedFix', model: 'sonnet', schema: FIDELITY_SCHEMA })
    if (fv && fv.pass) {
      finalText = fx.fixed
      fixedCount = capped.length
    } else {
      log(`표적 수정 fidelity 실패 — 수정 전 본문 유지: ${JSON.stringify(fv ? fv.violations : ['agent error'])}`)
    }
  }
} else {
  log('전역 심사·잔존 탐지 지적 0건 — 표적 수정 생략')
}

return {
  finalText,
  inputChars: text.length,
  outputChars: finalText.length,
  chunkStats: ordered.map(({ id, status, changes }) => ({ id, status, changes: changes || 0 })),
  overallChangeRate: Number(overallChangeRate.toFixed(4)),
  naturalnessVerdict: nat ? nat.verdict : 'agent-null',
  residualS1S2: resid ? resid.items.filter((i) => i.severity !== 'S3').length : -1,
  findingsCount: findings.length,
  fixedCount,
}
