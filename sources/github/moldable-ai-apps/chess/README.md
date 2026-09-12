# Chess

Play against Moldable in chat or with optional Voice, choose a local Stockfish
opponent, practice guided positions, and replay saved games.

## Engines

The opponent picker offers Moldable AI, a simple local opponent, and an
optional **Stockfish 18 smallnet** engine. Stockfish requires an explicit
one-time download of about 16 MB and then runs locally on the paired desktop.
Its installation and game history are scoped to your Moldable workspace.

The public app includes no personal games, credentials, or installed engine
pack. Both the desktop app and iPhone mobile-web bundle use the same game
state and presentation code.

## License

Chess's own code is **AGPL-3.0-or-later**, with the Moldable-dependency additional
permission in [COPYING.md](COPYING.md). See [LICENSE](LICENSE) for the full text
and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for Stockfish's upstream
license discrepancy and the chess-piece attribution. This license applies to
Chess, not the rest of the Moldable app collection.

## Development

Moldable owns app lifecycle. Use `pnpm test`, `pnpm check-types`, and `pnpm lint`
for checks, and `pnpm build:mobile` to update the iPhone bundle.
