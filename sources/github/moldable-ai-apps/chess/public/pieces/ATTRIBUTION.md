# Chess piece artwork

## Asset used

`chess-pieces-sprite.svg` is the unmodified **Chess Pieces Sprite** uploaded by
jurgenwesterhof and adapted from chess-piece artwork by Colin M.L. Burnett
(Wikimedia user Cburnett).

- Exact file page:
  https://commons.wikimedia.org/wiki/File:Chess_Pieces_Sprite.svg
- Original file:
  https://commons.wikimedia.org/wiki/Special:Redirect/file/Chess_Pieces_Sprite.svg
- Author information on the file page: jurgenwesterhof, adapted from work by
  Cburnett
- License stated in the file page's **Licensing** section: Creative Commons
  Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)
- License text: https://creativecommons.org/licenses/by-sa/3.0/
- Changes to the downloaded SVG: none
- SHA-1 of the downloaded file:
  `54767915cd8a1563d6f2343c2aafb0d98d7d7ecb`

## License verification notes

Verified against the exact Wikimedia Commons file page on 2026-07-29. The page
identifies this 2014 sprite as an adaptation and licenses the sprite under CC
BY-SA 3.0.

The CC0 notice in the Wikimedia Commons page footer applies to structured
file-namespace metadata; it is not the license for the uploaded SVG. The
license for the SVG itself is the license stated in the file's **Licensing**
section.

Cburnett's individual chess-piece files have their own file pages and may
offer multiple license choices. For example:
https://commons.wikimedia.org/wiki/File:Chess_kdt45.svg. Those choices do not
replace the CC BY-SA 3.0 license stated on the separate sprite file used here.

This attribution and license notice applies to
`chess-pieces-sprite.svg`. It does not apply to the rest of the Chess
application.

## Optional Stockfish engine

Stockfish is not bundled with Chess. A user may explicitly install the
Stockfish 18 smallnet WebAssembly engine pack from the app's opponent panel.
The installer downloads the pinned `@lichess-org/stockfish-web` 0.4.2 build,
its neural network, and the complete license text into that workspace's app
data.

- Lichess WebAssembly build source:
  https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e
- Upstream Stockfish source:
  https://github.com/official-stockfish/Stockfish
- Package metadata declares GNU Affero General Public License v3.0 or later
  (AGPL-3.0-or-later). The package LICENSE file is the GNU GPL v3 text; it is
  preserved verbatim. See THIRD-PARTY-NOTICES.md at the app root for both notices.
- Neural network: `nn-4ca89e4b3abf.nnue`

The downloaded engine pack remains a separately licensed component. The
installer writes a source manifest, exact file hashes, and the upstream
`LICENSE` file beside the installed engine.
