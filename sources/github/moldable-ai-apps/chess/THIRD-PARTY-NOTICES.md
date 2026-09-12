# Third-party notices

## Optional Stockfish 18 engine

Chess offers an optional local Stockfish 18 smallnet WebAssembly engine from
Lichess. Users explicitly install it into their workspace; the public app
release does not contain engine binaries, neural-network files, or user data.
The engine runs in a separate Node process and receives chess commands through
its UCI interface. Engine files are downloaded unmodified and checksum checked.

- Package: `@lichess-org/stockfish-web` **0.4.2**
- Package/source commit: `f09f4e11c44481f9112ee318a2e5e718dee2053e`
- Corresponding source, build scripts, and patches: [https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e](https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e)
- Source archive: https://github.com/lichess-org/stockfish-web/archive/f09f4e11c44481f9112ee318a2e5e718dee2053e.tar.gz
- Upstream Stockfish base: https://github.com/official-stockfish/Stockfish/tree/cb3d4ee9b47d0c5aae855b12379378ea1439675c
- Neural network: `nn-4ca89e4b3abf.nnue`, linked by the pinned source README

### Upstream license discrepancy

Verified on 2026-09-10: the pinned package's
[package.json](https://github.com/lichess-org/stockfish-web/blob/f09f4e11c44481f9112ee318a2e5e718dee2053e/package.json)
declares **AGPL-3.0-or-later**, while its included
[LICENSE](https://github.com/lichess-org/stockfish-web/blob/f09f4e11c44481f9112ee318a2e5e718dee2053e/LICENSE) contains the **GNU GPL version 3** text. These are
upstream notices, not interchangeable license names. We preserve the upstream
LICENSE unchanged and do not claim to resolve or replace upstream licensing.

Chess's own code is offered under AGPL-3.0-or-later as described in COPYING.md.
The installer retains the original engine LICENSE and writes SOURCE.md with
the exact source revision, package, and file hashes. Stockfish is provided
without warranty under its upstream terms.

## Chess-piece artwork

The unmodified `public/pieces/chess-pieces-sprite.svg` is by jurgenwesterhof,
adapted from Colin M. L. Burnett (Cburnett), under **CC BY-SA 3.0**.
See [the complete attribution](public/pieces/ATTRIBUTION.md) and
[the license](https://creativecommons.org/licenses/by-sa/3.0/).
The artwork is not relicensed under Chess's code license.

## Runtime libraries

Dependencies retain their licenses and copyright notices. In particular,
`chess.js` is BSD-2-Clause. `@moldable-ai/ui` and `@moldable-ai/storage` retain
their FSL-1.1-ALv2 terms; COPYING.md grants the additional permission for
combining them with Desiderata's Chess code.
