import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const sourceScripts = dirname(fileURLToPath(import.meta.url))

test('type checks reject missing dependencies and propagate compiler failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-types-test-'))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'notes'))
    writeFileSync(join(root, 'package.json'), '{"type":"module"}')
    writeFileSync(join(root, 'notes', 'tsconfig.json'), '{}')
    writeFileSync(
      join(root, 'notes', 'moldable.json'),
      '{"visibility":"public"}',
    )
    copyFileSync(
      join(sourceScripts, 'check-types.js'),
      join(root, 'scripts', 'check-types.js'),
    )
    const run = (env = process.env) =>
      spawnSync(process.execPath, ['scripts/check-types.js'], {
        cwd: root,
        encoding: 'utf8',
        env,
      })

    const missing = run()
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, /Missing dependencies/)
    assert.match(missing.stderr, /pnpm --dir notes install/)

    mkdirSync(join(root, 'notes', 'node_modules'))
    mkdirSync(join(root, 'bin'))
    const pnpm = join(root, 'bin', 'pnpm')
    writeFileSync(
      pnpm,
      '#!/bin/sh\necho "fixture compiler failure" >&2\nexit 1\n',
    )
    chmodSync(pnpm, 0o755)
    const env = {
      ...process.env,
      PATH: `${join(root, 'bin')}:${process.env.PATH}`,
    }
    const failed = run(env)
    assert.equal(failed.status, 1)
    assert.match(failed.stderr, /fixture compiler failure/)

    writeFileSync(pnpm, '#!/bin/sh\nexit 0\n')
    const passed = run(env)
    assert.equal(passed.status, 0)
    assert.match(passed.stdout, /All 1 app\(s\) passed/)

    mkdirSync(join(root, 'private-app'))
    writeFileSync(join(root, 'private-app', 'tsconfig.json'), '{}')
    writeFileSync(
      join(root, 'private-app', 'moldable.json'),
      '{"visibility":"private"}',
    )
    assert.equal(run(env).status, 1)
    const publicRelease = spawnSync(
      process.execPath,
      ['scripts/check-types.js', '--public-only'],
      { cwd: root, encoding: 'utf8', env },
    )
    assert.equal(publicRelease.status, 0)
    assert.match(publicRelease.stdout, /All 1 app\(s\) passed/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
