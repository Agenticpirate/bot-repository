# Simulated User Brief — eval-1 (make the app faster)

## Persona
Solo developer of an Electron-based macOS note-taking app. ~5k users.

## True intent (hidden until asked)
- "faster" means **cold-start time**: currently ~8 seconds from Dock click to usable window. Users complain about startup, not in-app lag.
- Runtime performance (scrolling/typing) is acceptable; NOT the concern.
- Target: under 3 seconds perceived (a fast splash/skeleton counts as "perceived").
- Constraints: no framework rewrite (stay on Electron), max ~2 weeks of solo work.
- No profiling has been done yet — if a "measure first" option is offered, prefer it.
- Baseline machine: M1 MacBook Air.
- Success criteria: cold start < 3s on M1 Air, averaged over 5 launches.

## Answering style
- Answer only what is asked; never volunteer unasked details.
- If a question isn't covered by this brief: "not sure — you decide".
- If no option fits, answer Other with a short free text consistent with the brief.
