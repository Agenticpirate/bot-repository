## Project
[Your project name] — [one-sentence description of what it does].

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- [Database: e.g., Prisma + PostgreSQL, Drizzle + SQLite]
- [Auth: e.g., NextAuth, Clerk, Supabase Auth]
- [Styling: e.g., Tailwind CSS 4, shadcn/ui]
- Deployed on [Vercel / AWS / etc.]

## Structure
- src/app/ — pages and routes (App Router)
- src/components/ — React components
- src/lib/ — shared utilities and helpers
- src/server/ — server-side logic, API helpers
- prisma/ — database schema and migrations

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test`
- Type check: `npx tsc --noEmit`

## Verification
After every change, run in this order:
1. `npx tsc --noEmit` — fix type errors
2. `npm test` — fix failing tests
3. `npm run lint` — fix lint errors
4. `npm run build` — confirm it builds

## Conventions
- Use shadcn/ui components — don't install new UI libraries
- Server Components by default, "use client" only when needed
- [Add: where config lives, how env vars work, naming patterns]
- For [complex domain topic], see docs/[relevant-guide].md

## Don't
- Don't use `any` — use `unknown` and narrow the type
- Don't skip error handling — always show user feedback
- Don't hardcode [config values] — they live in [config location]
