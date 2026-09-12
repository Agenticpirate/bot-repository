import type { BrowserProfile } from '../shared/bookmarks'
import { execFile } from 'node:child_process'
import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { existsSync } from 'node:fs'
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

interface BrowserDefinition {
  id: string
  name: string
  backend: 'chromium' | 'firefox'
  basePath: string
  keychainEntries: Array<{ service: string; account: string }>
}

interface SessionCookies {
  csrfToken: string
  cookieHeader: string
}

interface CookieRow {
  name: string
  value: string
  encrypted_value: Uint8Array
}

const BROWSERS: BrowserDefinition[] = [
  chromium('arc', 'Arc', 'Arc/User Data', [['Arc Safe Storage', 'Arc']]),
  chromium('chrome', 'Google Chrome', 'Google/Chrome', [
    ['Chrome Safe Storage', 'Chrome'],
    ['Chrome Safe Storage', 'Google Chrome'],
    ['Google Chrome Safe Storage', 'Chrome'],
  ]),
  chromium('brave', 'Brave', 'BraveSoftware/Brave-Browser', [
    ['Brave Safe Storage', 'Brave'],
    ['Brave Browser Safe Storage', 'Brave Browser'],
  ]),
  chromium('edge', 'Microsoft Edge', 'Microsoft Edge', [
    ['Microsoft Edge Safe Storage', 'Microsoft Edge'],
    ['Edge Safe Storage', 'Microsoft Edge'],
  ]),
  chromium('chromium', 'Chromium', 'Chromium', [
    ['Chromium Safe Storage', 'Chromium'],
  ]),
  chromium('helium', 'Helium', 'net.imput.helium', [
    ['Helium Storage Key', 'Helium'],
  ]),
  chromium('comet', 'Comet', 'Comet', [['Comet Safe Storage', 'Comet']]),
  chromium('dia', 'Dia', 'Dia/User Data', [['Dia Safe Storage', 'Dia']]),
  {
    id: 'firefox',
    name: 'Firefox',
    backend: 'firefox',
    basePath: join(homedir(), 'Library/Application Support/Firefox'),
    keychainEntries: [],
  },
]

export async function detectBrowserProfiles(): Promise<BrowserProfile[]> {
  const results = await Promise.all(BROWSERS.map(detectProfilesForBrowser))
  return results.flat().sort((a, b) => {
    if (a.hasXSession !== b.hasXSession) return a.hasXSession ? -1 : 1
    return `${a.browserName} ${a.profileName}`.localeCompare(
      `${b.browserName} ${b.profileName}`,
    )
  })
}

export async function readBrowserSession(
  browserId: string,
  profileId: string,
): Promise<SessionCookies> {
  const browser = BROWSERS.find((candidate) => candidate.id === browserId)
  if (!browser) throw new Error('That browser is not supported')
  const profiles = await detectProfilesForBrowser(browser)
  const profile = profiles.find(
    (candidate) => candidate.profileId === profileId,
  )
  if (!profile) throw new Error('That browser profile is no longer available')

  return browser.backend === 'firefox'
    ? readFirefoxSession(profileId)
    : readChromiumSession(browser, profileId)
}

async function detectProfilesForBrowser(
  browser: BrowserDefinition,
): Promise<BrowserProfile[]> {
  return browser.backend === 'firefox'
    ? detectFirefoxProfiles(browser)
    : detectChromiumProfiles(browser)
}

async function detectChromiumProfiles(
  browser: BrowserDefinition,
): Promise<BrowserProfile[]> {
  const entries = await readdir(browser.basePath, {
    withFileTypes: true,
  }).catch(() => [])
  const names = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === 'Default' || /^Profile \d+$/.test(entry.name)),
    )
    .map((entry) => entry.name)
  const labels = await chromiumProfileLabels(browser.basePath)

  const profiles = await Promise.all(
    names.map(async (profileId): Promise<BrowserProfile | null> => {
      const dbPath = chromiumCookiePath(browser.basePath, profileId)
      if (!(await fileExists(dbPath))) return null
      return {
        browserId: browser.id,
        browserName: browser.name,
        backend: 'chromium',
        profileId,
        profileName: labels.get(profileId) ?? profileId,
        hasXSession: await containsXSession(dbPath, 'chromium'),
      }
    }),
  )
  return profiles.filter(
    (profile): profile is BrowserProfile => profile !== null,
  )
}

async function detectFirefoxProfiles(
  browser: BrowserDefinition,
): Promise<BrowserProfile[]> {
  const profilesDir = join(browser.basePath, 'Profiles')
  const entries = await readdir(profilesDir, { withFileTypes: true }).catch(
    () => [],
  )
  const profiles = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<BrowserProfile | null> => {
        const profileId = entry.name
        const dbPath = join(profilesDir, profileId, 'cookies.sqlite')
        if (!(await fileExists(dbPath))) return null
        return {
          browserId: browser.id,
          browserName: browser.name,
          backend: 'firefox',
          profileId,
          profileName: entry.name.replace(/^[^.]+\./, ''),
          hasXSession: await containsXSession(dbPath, 'firefox'),
        }
      }),
  )
  return profiles.filter(
    (profile): profile is BrowserProfile => profile !== null,
  )
}

async function containsXSession(
  dbPath: string,
  backend: 'chromium' | 'firefox',
): Promise<boolean> {
  try {
    return await withDatabaseSnapshot(dbPath, (database) => {
      const table = backend === 'chromium' ? 'cookies' : 'moz_cookies'
      const host = backend === 'chromium' ? 'host_key' : 'host'
      const rows = database
        .prepare(
          `SELECT name FROM ${table} WHERE (${host} = 'x.com' OR ${host} LIKE '%.x.com' OR ${host} = 'twitter.com' OR ${host} LIKE '%.twitter.com') AND name IN ('ct0', 'auth_token')`,
        )
        .all() as Array<{ name: string }>
      const names = new Set(rows.map((row) => row.name))
      return names.has('ct0') && names.has('auth_token')
    })
  } catch {
    return false
  }
}

async function readChromiumSession(
  browser: BrowserDefinition,
  profileId: string,
): Promise<SessionCookies> {
  const dbPath = chromiumCookiePath(browser.basePath, profileId)
  const password = await readKeychainPassword(browser)
  const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1')

  const values = await withDatabaseSnapshot(dbPath, (database) => {
    const rows = database
      .prepare(
        `SELECT name, value, encrypted_value FROM cookies WHERE (host_key = 'x.com' OR host_key LIKE '%.x.com' OR host_key = 'twitter.com' OR host_key LIKE '%.twitter.com') AND name IN ('ct0', 'auth_token') ORDER BY last_access_utc DESC`,
      )
      .all() as unknown as CookieRow[]
    const versionRow = database
      .prepare("SELECT value FROM meta WHERE key = 'version'")
      .get() as { value?: string } | undefined
    const dbVersion = Number(versionRow?.value ?? 0)
    const result = new Map<string, string>()
    for (const row of rows) {
      if (result.has(row.name)) continue
      const encrypted = Buffer.from(row.encrypted_value ?? [])
      const value =
        row.value || decryptChromiumCookie(encrypted, key, dbVersion)
      if (value) result.set(row.name, cleanCookie(value))
    }
    return result
  })
  return requireSessionCookies(values, browser.name)
}

async function readFirefoxSession(profileId: string): Promise<SessionCookies> {
  const firefox = BROWSERS.find((browser) => browser.id === 'firefox')
  if (!firefox) throw new Error('Firefox support is unavailable')
  const values = await withDatabaseSnapshot(
    join(firefox.basePath, 'Profiles', profileId, 'cookies.sqlite'),
    (database) => {
      const rows = database
        .prepare(
          `SELECT name, value FROM moz_cookies WHERE (host = 'x.com' OR host LIKE '%.x.com' OR host = 'twitter.com' OR host LIKE '%.twitter.com') AND name IN ('ct0', 'auth_token') ORDER BY lastAccessed DESC`,
        )
        .all() as Array<{ name: string; value: string }>
      return new Map(rows.map((row) => [row.name, cleanCookie(row.value)]))
    },
    true,
  )
  return requireSessionCookies(values, 'Firefox')
}

function requireSessionCookies(
  values: Map<string, string>,
  browserName: string,
): SessionCookies {
  const csrfToken = values.get('ct0')
  const authToken = values.get('auth_token')
  if (!csrfToken || !authToken) {
    throw new Error(`No active X session was found in ${browserName}`)
  }
  return {
    csrfToken,
    cookieHeader: `ct0=${csrfToken}; auth_token=${authToken}`,
  }
}

function decryptChromiumCookie(
  encrypted: Buffer,
  key: Buffer,
  dbVersion: number,
): string {
  if (encrypted.length < 4) return encrypted.toString('utf8')
  const prefix = encrypted.subarray(0, 3).toString('ascii')
  if (prefix !== 'v10' && prefix !== 'v11') return encrypted.toString('utf8')
  const decipher = createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, 0x20))
  let plain = Buffer.concat([
    decipher.update(encrypted.subarray(3)),
    decipher.final(),
  ])
  if (dbVersion >= 24 && plain.length > 32) plain = plain.subarray(32)
  return plain.toString('utf8')
}

async function readKeychainPassword(
  browser: BrowserDefinition,
): Promise<string> {
  for (const entry of browser.keychainEntries) {
    try {
      const { stdout } = await execFileAsync(
        '/usr/bin/security',
        [
          'find-generic-password',
          '-w',
          '-s',
          entry.service,
          '-a',
          entry.account,
        ],
        { timeout: 10_000 },
      )
      if (stdout.trim()) return stdout.trim()
    } catch {
      // Try the next known keychain label for this browser.
    }
  }
  throw new Error(
    `macOS could not unlock ${browser.name}'s cookie encryption key`,
  )
}

async function withDatabaseSnapshot<T>(
  source: string,
  task: (database: DatabaseSync) => T,
  copySidecars = false,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'moldable-x-cookies-'))
  const snapshot = join(directory, basename(source))
  try {
    await copyFile(source, snapshot)
    if (copySidecars) {
      for (const suffix of ['-wal', '-shm']) {
        if (await fileExists(`${source}${suffix}`)) {
          await copyFile(`${source}${suffix}`, `${snapshot}${suffix}`)
        }
      }
    }
    const database = new DatabaseSync(snapshot, { readOnly: true })
    try {
      return task(database)
    } finally {
      database.close()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function chromiumProfileLabels(
  basePath: string,
): Promise<Map<string, string>> {
  try {
    const state = JSON.parse(
      await readFile(join(basePath, 'Local State'), 'utf8'),
    ) as {
      profile?: { info_cache?: Record<string, { name?: string }> }
    }
    return new Map(
      Object.entries(state.profile?.info_cache ?? {}).map(([id, value]) => [
        id,
        value.name || id,
      ]),
    )
  } catch {
    return new Map()
  }
}

function chromiumCookiePath(basePath: string, profileId: string): string {
  const networkPath = join(basePath, profileId, 'Network', 'Cookies')
  return existsSync(networkPath)
    ? networkPath
    : join(basePath, profileId, 'Cookies')
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

function cleanCookie(value: string): string {
  const cleaned = value.replace(/\0+$/g, '').trim()
  if (!cleaned || !/^[\x21-\x7e]+$/.test(cleaned)) {
    throw new Error('The X session cookie could not be decoded')
  }
  return cleaned
}

function chromium(
  id: string,
  name: string,
  applicationSupportPath: string,
  keychainEntries: Array<[string, string]>,
): BrowserDefinition {
  return {
    id,
    name,
    backend: 'chromium',
    basePath: join(
      homedir(),
      'Library/Application Support',
      applicationSupportPath,
    ),
    keychainEntries: keychainEntries.map(([service, account]) => ({
      service,
      account,
    })),
  }
}
