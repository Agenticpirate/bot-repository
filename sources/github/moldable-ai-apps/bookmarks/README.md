# Bookmarks

Bookmarks is a private, workspace-scoped X bookmark reader for Moldable. It keeps
the canonical archive as ordinary files and exposes bounded search/read methods to
other approved Moldable agents.

## Storage

Each Moldable workspace owns its own data directory:

- `bookmarks.jsonl` — canonical bookmark archive
- `folders.json` — mirrored X folder names and counts
- `connection.json` — non-secret connection metadata only
- `sync-state.json` — sync progress and latest error

Search uses a disposable in-memory index rebuilt from `bookmarks.jsonl`. The app
does not create a SQLite database or download media files.

## Authentication and privacy

The default connection reads an explicitly confirmed local browser profile. It
checks cookie names while detecting profiles, asks the user to confirm one, then
decrypts the selected X session only when syncing. Cookie values remain in memory
for the request and are never written to app storage, logs, argv, or environment
variables.

Official X OAuth is an optional advanced path. Long-lived access and refresh token
material is stored as workspace-scoped `X_OAUTH_JSON` in aivault. The Bookmarks
app exchanges the short-lived authorization code, then all API calls and automatic
token refreshes run through aivault's read-only `x/bookmarks` capability.

The server rejects foreign browser origins from private API routes. Disconnecting
removes the OAuth credential when applicable but deliberately preserves the local
archive.

## Sync behavior

- Starts automatically when a connected archive is more than 24 hours stale.
- Can be started at any time with the Refresh button or `bookmarks.sync` app API.
- Stops the main timeline walk after reaching a locally known bookmark.
- Mirrors every available X bookmark folder into `folderIds`/`folderNames`.
- Uses GET requests only and never adds, removes, or reorganizes bookmarks on X.

The browser-session path relies on X's private web interface and may need small
query updates if X changes its web client. The optional official API is more stable
but X charges pay-per-use fees for returned resources.
