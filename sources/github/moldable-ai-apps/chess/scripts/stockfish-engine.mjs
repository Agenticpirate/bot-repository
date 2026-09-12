import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const [installDir, fen, difficulty = 'club'] = process.argv.slice(2)
if (!installDir || !fen) process.exit(2)

const levels = {
  friendly: { elo: 1320, moveTime: 80 },
  club: { elo: 1800, moveTime: 180 },
  master: { elo: 2400, moveTime: 350 },
}
const level = levels[difficulty] ?? levels.club
const messages = []
let wake = () => {}
let engine

function receive(message) {
  messages.push(String(message))
  wake()
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
  throw new Error('Stockfish response timed out')
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
  engine.uci('setoption name Hash value 16')
  engine.uci('setoption name UCI_LimitStrength value true')
  engine.uci(`setoption name UCI_Elo value ${level.elo}`)
  engine.uci('isready')
  await waitFor((line) => line === 'readyok')
  engine.uci(`position fen ${fen}`)
  engine.uci(`go movetime ${level.moveTime}`)
  const bestMove = await waitFor((line) => line.startsWith('bestmove '), 1_500)
  process.stdout.write(bestMove.split(/\s+/)[1] ?? '')
  engine.uci('quit')
  setTimeout(() => process.exit(0), 25)
} catch (error) {
  if (engine) engine.uci('quit')
  process.stderr.write(error instanceof Error ? error.message : String(error))
  setTimeout(() => process.exit(1), 25)
}
