export function syncProgressLabel(phase?: string): string {
  if (!phase) return 'Starting…'

  const bookmarkPage = phase.match(
    /^Reading bookmarks · page (\d+) · (\d+) new$/,
  )
  if (bookmarkPage) {
    const page = Number(bookmarkPage[1])
    const synced = Number(bookmarkPage[2])
    return `${synced.toLocaleString()} synced · page ${page}`
  }

  const folder = phase.match(/^Mirroring folder · (.+)$/)
  if (folder) return `Syncing ${folder[1]}…`
  if (phase === 'Reading local archive') return 'Preparing…'
  return phase
}
