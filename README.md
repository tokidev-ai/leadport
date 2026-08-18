# LeadPort

Real estate link-in-bio with lead capture. See [PLAN.md](PLAN.md) for product and
architecture, [ISSUES.md](ISSUES.md) for the backlog, [CLAUDE.md](CLAUDE.md) for
the working rules on this repo.

## Local setup

1. Install Node 20+ and npm.
2. `npm install`
3. `cp .env.example .env.local` and fill in real values (never commit `.env.local`).
4. `npm run dev` — app runs at http://localhost:3000
5. `npm run typecheck` — TypeScript, no emit
6. `npm run lint` — ESLint
7. `npm run format` — Prettier, writes changes (`format:check` to only verify)
8. `npm run build` — production build
