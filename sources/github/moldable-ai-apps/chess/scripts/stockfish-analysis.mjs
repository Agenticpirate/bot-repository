import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const [installDir, fen] = process.argv.slice(2)
if (!installDir || !fen) process.exit(2)

const messages = []
const latestLines = new Map()
let wake = () => {}
let engine

function receive(message) {
  const line = String(message)
  messages.push(line)
  if (line.startsWith('info ') && line.includes(' pv ')) {
    const parsed = parseInfo(line)
    if (parsed) latestLines.set(parsed.multipv, parsed)
  }
  wake()
}

function numberAfter(tokens, name) {
  const index = tokens.indexOf(name)
  if (index < 0) return undefined
  const value = Number(tokens[index + 1])
  return Number.isFinite(value) ? value : undefined
}

function parseInfo(line) {
  const tokens = line.split(/\s+/)
  const pvIndex = tokens.indexOf('pv')
  const scoreIndex = tokens.indexOf('score')
  if (pvIndex < 0 || scoreIndex < 0) return null
  const pv = tokens
    .slice(pvIndex + 1)
    .filter((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
  if (pv.length === 0) return null

  const scoreKind = tokens[scoreIndex + 1]
  const scoreValue = Number(tokens[scoreIndex + 2])
  const wdlIndex = tokens.indexOf('wdl')
  const wdl =
    wdlIndex >= 0
      ? {
          win: Number(tokens[wdlIndex + 1]),
          draw: Number(tokens[wdlIndex + 2]),
          loss: Number(tokens[wdlIndex + 3]),
        }
      : undefined

  return {
    move: pv[0],
    depth: numberAfter(tokens, 'depth') ?? 0,
    multipv: numberAfter(tokens, 'multipv') ?? 1,
    ...(scoreKind === 'cp' && Number.isFinite(scoreValue)
      ? { centipawns: scoreValue }
      : {}),
    ...(scoreKind === 'mate' && Number.isFinite(scoreValue)
      ? { mateIn: scoreValue }
      : {}),
    ...(wdl &&
    Number.isFinite(wdl.win) &&
    Number.isFinite(wdl.draw) &&
    Number.isFinite(wdl.loss)
      ? { wdl }
      : {}),
    pv,
  }
}

async function waitFor(predicate, timeoutMs = 1_500) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const index = messages.findIndex(predicate)
    if (index >= 0) return messages.splice(index, 1)[0]
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, Math.min(50, deadline - Date.now()))
      wake = () => {
        clearTimeout(timeout)
        wake = () => {}
        resolve()
      }
    })
  }
  throw new Error('Stockfish analysis timed out')
}

try {
  const engineModule = await import(
    pathToFileURL(path.join(installDir, 'sf_18_smallnet.js')).href
  )
  engine = await engineModule.default({
    listen: receive,
    onError: () => {},
  })
  const nnueName = engine.getRecommendedNnue(0)
  if (!nnueName) throw new Error('Stockfish did not request an NNUE file')
  engine.setNnueBuffer(await readFile(path.join(installDir, nnueName)), 0)

  engine.uci('uci')
  await waitFor((line) => line === 'uciok')
  engine.uci('setoption name Threads value 1')
  engine.uci('setoption name Hash value 32')
  engine.uci('setoption name MultiPV value 3')
  engine.uci('setoption name UCI_ShowWDL value true')
  engine.uci('isready')
  await waitFor((line) => line === 'readyok')
  engine.uci(`position fen ${fen}`)
  engine.uci('go movetime 300')
  await waitFor((line) => line.startsWith('bestmove '), 2_000)

  const lines = [...latestLines.values()]
    .sort((left, right) => left.multipv - right.multipv)
    .map(({ multipv: _multipv, ...line }) => line)
  process.stdout.write(JSON.stringify({ lines }))
  engine.uci('quit')
  setTimeout(() => process.exit(0), 25)
} catch (error) {
  if (engine) engine.uci('quit')
  process.stderr.write(error instanceof Error ? error.message : String(error))
  setTimeout(() => process.exit(1), 25)
}
