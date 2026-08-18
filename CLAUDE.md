# CLAUDE.md

Working rules for this repo. See [PLAN.md](PLAN.md) for product/architecture context
and [ISSUES.md](ISSUES.md) for the issue backlog (mirrored on
[GitHub](https://github.com/tokidev-ai/leadport/issues), milestone `v0`).

This is a solo project — one developer + Claude, no other reviewer. These rules exist
_because_ there's no second human in the loop; they're the substitute for code review.

---

## 1. One issue at a time, human-gated

Work one GitHub issue (`LP-01`, `LP-02`, ...) at a time, in phase order unless the
human directs otherwise. For each issue:

1. Implement it fully against its Acceptance Criteria in [ISSUES.md](ISSUES.md) /
   the GitHub issue body.
2. Run whatever verification applies (typecheck, lint, tests, rules tests, a manual
   check in the browser/emulator) and report the result.
3. **Stop. Report what was done, against the AC checklist, and wait for the human to
   validate it.** Do not start the next issue, and do not commit or push, until the
   human explicitly confirms this issue is good.
4. If the human requests changes, make them and return to step 3. Do not move on with
   unresolved feedback.
5. Once validated: commit and push per §2, then **close the corresponding GitHub
   issue** — comment on it confirming the AC were met (reference the commit) and
   close it. Only move to the next issue after the current one is closed.

Never batch multiple issues into one implementation pass and present them together —
the human validates one issue at a time, so implement one at a time. If an issue turns
out to need work that clearly belongs to a different issue, say so and ask rather than
silently expanding scope.

## 2. Commit and push only after human validation

- **No commit, and no push to `main`, until the human has validated the current
  issue.** Validation is an explicit signal from the human in chat (e.g. "looks
  good", "approved", "ship it") — not silence, not moving on to a new topic, not
  "no objection so far."
- One issue → one commit (or a small tightly-scoped set of commits if the human asks
  for that split). Commit message should name the issue id (`LP-07: add Sentry error
tracking`).
- Push straight to `main` is fine for this project **once validated** — no PR
  workflow required unless the human asks for one later.
- If asked to implement several issues in a row, still gate each one individually:
  implement → stop → validate → commit/push → close issue (§1.5) → next. Don't queue
  up unpushed commits or open issues across multiple issues.

## 3. Never commit secrets

- Never commit API keys, tokens, service account JSON, `.env` files, or any
  credential — Firebase, Stripe, Sentry, Vercel, or otherwise.
- `.env.example` may list variable _names_ with placeholder values, never real ones.
- Firebase Admin SDK service account keys stay out of the repo entirely — read from
  environment variables / the deploy platform's secret store.
- Before every commit, check `git status` and `git diff` for anything that looks like
  a credential — even in a file whose name looks innocuous (config dumps, seed
  scripts, debug logs) — and pull it out before staging if found.
- If a secret is ever accidentally committed: stop, tell the human immediately, and
  treat it as compromised (needs rotation) — don't just delete it in a follow-up
  commit and consider it handled, since it's still in history.

## 4. General git discipline

- `git status` before anything that can discard work (`checkout`, `restore`, `reset`,
  `clean`) — stash or commit first if there's anything uncommitted.
- Never `--force` push to `main`.
- Never skip hooks (`--no-verify`) or amend a commit that's already been pushed.
- Prefer new commits over amending, per standard practice — amending is fine pre-push
  on the current issue's not-yet-validated work if it keeps history clean, but never
  rewrite anything already pushed.

## 5. Definition of done, per issue

An issue isn't done because the code compiles. Before presenting it for validation:

- Every AC checkbox in the issue is actually satisfied, not just plausible.
- `npm run typecheck` and `npm run lint` pass.
- Relevant tests pass, including Firestore rules tests where the issue touches rules
  or data access (§6 of PLAN.md — this is the one area where a subtle bug is a data
  breach, not a bug).
- Anything touching money (Stripe) or compliance (license display, TCPA consent, Fair
  Housing) gets called out explicitly in the report to the human — these are the
  categories PLAN.md §7 says to always verify by hand, not just glance at.

## 6. Scope discipline

- Build what the issue's AC asks for — no unrequested refactors, no speculative
  abstraction, no "while I was in there" cleanup bundled into the same commit.
- If cleanup is genuinely warranted, name it separately rather than folding it in
  silently.
- Follow PLAN.md's cuts. Don't quietly build v1/v2 scope while implementing a v0
  issue (e.g. don't add theming while doing LP-13's single template, don't add SMS
  notification while doing LP-33's email-only scope).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
