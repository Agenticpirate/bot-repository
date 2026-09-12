import { watch } from 'chokidar'
import { spawn } from 'node:child_process'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

process.env.PORTLESS_HTTPS ??= '1'
process.env.PORTLESS_PORT ??= '1355'

function getArgValue(flagA, flagB) {
  const idxA = process.argv.indexOf(flagA)
  if (idxA !== -1 && process.argv[idxA + 1]) return process.argv[idxA + 1]
  if (flagB) {
    const idxB = process.argv.indexOf(flagB)
    if (idxB !== -1 && process.argv[idxB + 1]) return process.argv[idxB + 1]
  }
  return null
}

const port =
  getArgValue('-p', '--port') ??
  process.env.MOLDABLE_PORT ??
  process.env.PORT ??
  null
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--')
const tsxBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsx')
const instancesFile = path.join(process.cwd(), '.moldable.instances.json')
const isProduction = process.env.NODE_ENV === 'production'
const watchPaths = ['src/server', 'src/shared'].filter((watchPath) =>
  fsSync.existsSync(path.join(process.cwd(), watchPath)),
)

if (!fsSync.existsSync(tsxBin)) {
  console.error(`Error: tsx binary not found at ${tsxBin}`)
  console.error('Run "pnpm install" to install dependencies.')
  process.exit(1)
}

let child = null
let registeredPid = null
let watcher = null
let restartTimer = null
let unexpectedRestartDelay = 250
let restartQueue = Promise.resolve()
let registryQueue = Promise.resolve()
let shuttingDown = false
const expectedExits = new WeakSet()

async function readInstances() {
  try {
    return JSON.parse(await fs.readFile(instancesFile, 'utf8'))
  } catch {
    return []
  }
}

function updateInstances(update) {
  registryQueue = registryQueue.then(async () => {
    const nextInstances = update(await readInstances())
    if (nextInstances.length === 0) {
      await fs.unlink(instancesFile).catch(() => {})
      return
    }
    await fs.writeFile(
      instancesFile,
      JSON.stringify(nextInstances, null, 2),
      'utf8',
    )
  })
  return registryQueue
}

async function registerInstance(pid) {
  await updateInstances((instances) => [
    ...instances.filter((instance) => instance.pid !== pid),
    {
      pid,
      port: port ? Number(port) : null,
      startedAt: new Date().toISOString(),
    },
  ])
  registeredPid = pid
}

async function unregisterInstance(pid) {
  await updateInstances((instances) =>
    instances.filter((instance) => instance.pid !== pid),
  )
  if (registeredPid === pid) registeredPid = null
}

function terminateProcess(target, signal = 'SIGTERM') {
  if (!target?.pid || target.exitCode !== null || target.signalCode !== null)
    return
  try {
    if (process.platform === 'win32') {
      target.kill(signal)
    } else {
      process.kill(-target.pid, signal)
    }
  } catch {
    try {
      target.kill(signal)
    } catch {
      // Ignore process shutdown races.
    }
  }
}

function waitForExit(target) {
  if (target.exitCode !== null || target.signalCode !== null)
    return Promise.resolve()
  return new Promise((resolve) => target.once('exit', resolve))
}

async function stopChild(signal = 'SIGTERM') {
  const target = child
  if (!target) return

  expectedExits.add(target)
  terminateProcess(target, signal)
  const forceKillTimer = setTimeout(
    () => terminateProcess(target, 'SIGKILL'),
    5000,
  )
  forceKillTimer.unref()
  await waitForExit(target)
  clearTimeout(forceKillTimer)
}

async function startChild() {
  if (shuttingDown || child) return

  const startedAt = Date.now()
  const nextChild = spawn(tsxBin, ['src/server/index.ts', ...forwardedArgs], {
    env: {
      ...process.env,
      MOLDABLE_APP_ID: process.env.MOLDABLE_APP_ID ?? 'wiki',
      ...(port ? { MOLDABLE_PORT: port, PORT: port } : {}),
    },
    detached: process.platform !== 'win32',
    stdio: 'inherit',
  })
  child = nextChild

  nextChild.on('error', (error) => {
    console.error(`[moldable-dev] Failed to start server: ${error.message}`)
  })

  if (!nextChild.pid) {
    child = null
    throw new Error('Server process did not provide a PID.')
  }

  const pid = nextChild.pid
  nextChild.on('exit', async (code, signal) => {
    if (child === nextChild) child = null
    await unregisterInstance(pid).catch(() => {})

    if (isProduction && !shuttingDown) {
      if (signal) process.kill(process.pid, signal)
      process.exit(code ?? 0)
      return
    }
    if (shuttingDown || expectedExits.has(nextChild)) return

    const uptime = Date.now() - startedAt
    if (uptime >= 2000) unexpectedRestartDelay = 250
    const delay = unexpectedRestartDelay
    unexpectedRestartDelay = Math.min(unexpectedRestartDelay * 2, 5000)
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    console.error(
      `[moldable-dev] Server exited with ${reason}; restarting in ${delay}ms`,
    )
    scheduleRestart('server exit', delay)
  })

  await registerInstance(pid)
}

function scheduleRestart(reason, delay = 75) {
  if (shuttingDown) return
  clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    restartQueue = restartQueue
      .then(async () => {
        if (shuttingDown) return
        console.log(`[moldable-dev] ${reason}; restarting server`)
        await stopChild()
        await startChild()
      })
      .catch((error) => {
        console.error(`[moldable-dev] Restart failed: ${error.message}`)
      })
  }, delay)
}

async function shutdown(signal, exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  clearTimeout(restartTimer)
  await watcher?.close().catch(() => {})
  await stopChild(signal)
  if (registeredPid) await unregisterInstance(registeredPid).catch(() => {})
  await Promise.allSettled([restartQueue, registryQueue])
  process.exit(exitCode)
}

process.on('exit', () => {
  terminateProcess(child)
  if (!registeredPid) return
  try {
    const instances = JSON.parse(fsSync.readFileSync(instancesFile, 'utf8'))
    const filtered = instances.filter(
      (instance) => instance.pid !== registeredPid,
    )
    if (filtered.length === 0) {
      fsSync.unlinkSync(instancesFile)
    } else {
      fsSync.writeFileSync(instancesFile, JSON.stringify(filtered, null, 2))
    }
  } catch {
    // Ignore cleanup errors during process exit.
  }
})

process.on('SIGINT', () => void shutdown('SIGINT', 130))
process.on('SIGTERM', () => void shutdown('SIGTERM', 143))

if (isProduction) {
  await startChild()
} else {
  if (watchPaths.length === 0) {
    console.error(
      '[moldable-dev] No server source directories were found to watch.',
    )
    process.exit(1)
  }

  watcher = watch(watchPaths, {
    cwd: process.cwd(),
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  })
  watcher.on('all', (eventName, changedPath) => {
    unexpectedRestartDelay = 250
    scheduleRestart(`${eventName}: ${changedPath}`)
  })
  watcher.on('error', (error) => {
    console.error(`[moldable-dev] Watcher error: ${error.message}`)
  })
  await new Promise((resolve) => watcher.once('ready', resolve))
  console.log(`[moldable-dev] Watching ${watchPaths.join(', ')}`)
  await startChild()
}
