#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export function isAppOwnedApiIdentifier(identifier, appId) {
  const prefix = `${appId}.`
  return (
    typeof identifier === 'string' &&
    (identifier === appId ||
      (identifier.startsWith(prefix) && identifier.length > prefix.length))
  )
}

export function validateAppApiNamespace(manifest, appId) {
  if (manifest.appApi === undefined) return []

  const capabilities = manifest.appApi?.capabilities
  if (!Array.isArray(capabilities)) {
    return ['appApi.capabilities must be an array']
  }

  const errors = []
  for (const capability of capabilities) {
    if (!isAppOwnedApiIdentifier(capability?.id, appId)) {
      errors.push(`capability ${JSON.stringify(capability?.id)}`)
    }
    if (!Array.isArray(capability?.scopes)) continue
    for (const scope of capability.scopes) {
      if (!isAppOwnedApiIdentifier(scope?.id, appId)) {
        errors.push(`scope ${JSON.stringify(scope?.id)}`)
      }
    }
  }
  return errors
}

function appDirectories(args) {
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  )
  const candidates =
    args.length > 0
      ? args.map((entry) => path.resolve(entry))
      : fs
          .readdirSync(repositoryRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(repositoryRoot, entry.name))

  return candidates.filter((candidate) =>
    fs.existsSync(path.join(candidate, 'moldable.json')),
  )
}

export function lintAppApiNamespaces(directories) {
  const failures = []
  for (const directory of directories) {
    const appId = path.basename(directory)
    const manifestPath = path.join(directory, 'moldable.json')
    let manifest
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    } catch (error) {
      failures.push({
        appId,
        errors: [
          `could not parse moldable.json: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      })
      continue
    }

    const errors = validateAppApiNamespace(manifest, appId)
    if (errors.length > 0) failures.push({ appId, errors })
  }
  return failures
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  const directories = appDirectories(process.argv.slice(2))
  const failures = lintAppApiNamespaces(directories)
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `${failure.appId}: app API identifiers must equal "${failure.appId}" or start with "${failure.appId}."`,
      )
      for (const error of failure.errors) console.error(`  - ${error}`)
    }
    process.exitCode = 1
  } else {
    console.log(
      `App API namespaces are valid for ${directories.length} Moldable app${directories.length === 1 ? '' : 's'}.`,
    )
  }
}
