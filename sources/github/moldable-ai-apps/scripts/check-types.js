#!/usr/bin/env node
/**
 * Run TypeScript type checking on all apps in the repo.
 * Runs `tsc --noEmit` in each app directory that has a tsconfig.json.
 */
import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const publicOnly = process.argv.includes('--public-only')

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'scripts',
  'dist',
  '.vite',
  '.turbo',
]

function findApps(dir) {
  const apps = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue

    const entryPath = join(dir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      if (publicOnly) {
        const manifestPath = join(entryPath, 'moldable.json')
        if (!existsSync(manifestPath)) continue
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        if (manifest.visibility !== 'public') continue
      }
      const tsconfigPath = join(entryPath, 'tsconfig.json')
      const nodeModulesPath = join(entryPath, 'node_modules')
      // Missing dependencies must not silently remove apps from release checks.
      if (existsSync(tsconfigPath)) {
        apps.push({
          name: entry,
          path: entryPath,
          hasDependencies: existsSync(nodeModulesPath),
        })
      }
    }
  }

  return apps
}

function main() {
  const apps = findApps(ROOT)

  if (apps.length === 0) {
    console.log('No apps with tsconfig.json found.')
    process.exit(0)
  }

  console.log(`🔍 Type checking ${apps.length} app(s)...\n`)

  let failed = 0

  for (const app of apps) {
    process.stdout.write(`  ${app.name}... `)

    if (!app.hasDependencies) {
      console.log('✗')
      console.error(
        `  Missing dependencies. Run pnpm --dir ${app.name} install${existsSync(join(app.path, 'pnpm-workspace.yaml')) ? '' : ' --ignore-workspace'}.`,
      )
      failed++
      continue
    }

    try {
      execSync('pnpm exec tsc --noEmit', {
        cwd: app.path,
        stdio: 'pipe',
        encoding: 'utf-8',
      })
      console.log('✓')
    } catch (error) {
      console.log('✗')
      console.error(`\n${error.stdout || ''}${error.stderr || ''}\n`)
      failed++
    }
  }

  console.log('')

  if (failed > 0) {
    console.log(`❌ ${failed} app(s) failed type checking`)
    process.exit(1)
  } else {
    console.log(`✅ All ${apps.length} app(s) passed type checking`)
  }
}

main()
