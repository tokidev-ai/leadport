# LeadPort — Implementation Issues

Companion to [PLAN.md](PLAN.md). Section references (§) point there.

**Scope of this doc:** v0 is specified in full (LP-01 → LP-35) because that's what
gets built next. v1/v2 are epic-level stubs only — per §3, everything after the v0
agent checkpoint is a guess until those interviews happen, and writing 40 detailed
issues against a guess is how you end up building the wrong thing carefully. Expand
each epic after the checkpoint.

**Labels used:** `setup` `auth` `editor` `public` `leads` `compliance` `design` `seo`
`infra` `security` `epic`

**Estimates** assume Claude writing most code, in focused-day units. Multiply by ~2.5
for nights-and-weekends pace.

---

## Suggested order

```
Phase 0 ──▶ LP-01 ─▶ LP-02 ─▶ LP-03 ─▶ LP-04 ─▶ LP-05 ─▶ LP-06 ─▶ LP-07
Phase 1 ──▶ LP-08 ─▶ LP-09 ─▶ LP-10 ─▶ LP-11
Phase 2 ──▶ LP-12 ─▶ LP-13 ─▶ LP-14 ─▶ LP-15
Phase 3 ──▶ LP-16 ─▶ LP-17 ─▶ LP-18 ─▶ LP-19 ─▶ LP-20 ─▶ LP-21 ─▶ LP-22
Phase 4 ──▶ LP-23 ─▶ LP-24 ─▶ LP-25 ─▶ LP-26 ─▶ LP-27 ─▶ LP-28
Phase 5 ──▶ LP-29 ─▶ LP-30 ─▶ LP-31 ─▶ LP-32 ─▶ LP-33 ─▶ LP-34
            LP-35  ⏸ v0 checkpoint — do not skip
```

LP-13 (Template #1) deliberately precedes the editor. See §8.1 — an ugly v0 produces
false-negative feedback and you won't know it.

---

# Phase 0 — Foundations

### LP-01 — Scaffold Next.js app with strict TypeScript
**Est:** 0.5d · **Labels:** `setup`

Create the App Router project with the tooling that prevents a class of bugs from ever
appearing. Strict mode from commit one — retrofitting it later means fixing hundreds of
errors at once.

**Acceptance criteria**
- [ ] Next.js App Router project at repo root, TypeScript `strict: true`
- [ ] `noUncheckedIndexedAccess` and `noImplicitOverride` enabled
- [ ] ESLint + Prettier configured, single `npm run lint` passes clean
- [ ] `npm run typecheck` script exists and passes
- [ ] Path alias `@/*` → `src/*` configured
- [ ] `.env.example` committed listing every env var the app reads
- [ ] `README.md` documents local setup in under 10 steps

---

### LP-02 — Tailwind, shadcn/ui, and the design token contract
**Est:** 1d · **Labels:** `setup`, `design`

Set up styling *and* the token layer templates will consume (§8.5). The token contract
is the part that matters — doing it now costs an hour, retrofitting it after five
templates exist costs days.

**Acceptance criteria**
- [ ] Tailwind configured; shadcn/ui initialized with at least Button, Input, Card,
      Dialog, Tabs installed
- [ ] Semantic CSS variables defined (`--surface`, `--surface-raised`, `--text`,
      `--text-muted`, `--accent`, `--accent-contrast`, `--border`) and mapped into the
      Tailwind theme
- [ ] Components reference semantic tokens, never raw Tailwind colors (`bg-surface`,
      not `bg-white`)
- [ ] Type scale defined with body ≥ 17px (§8.3)
- [ ] `next/font` self-hosting configured, max 2 families
- [ ] A `/dev/tokens` page renders every token so regressions are visible
- [ ] Light and dark token sets both defined

---

### LP-03 — Firebase projects and SDK wiring
**Est:** 0.5d · **Labels:** `setup`, `infra`

Two Firebase projects (dev, prod) and both SDKs wired with a clear boundary: client SDK
for the dashboard, Admin SDK for server actions (§4).

**Acceptance criteria**
- [ ] Separate `leadport-dev` and `leadport-prod` Firebase projects
- [ ] Client SDK initialized as a singleton, safe under Fast Refresh
- [ ] Admin SDK initialized server-only; module throws if imported client-side
- [ ] Service account credentials read from env, never committed
- [ ] Firebase emulator suite runs Auth + Firestore + Storage via one npm script
- [ ] `NEXT_PUBLIC_*` vars contain no secrets (verified by inspecting the client bundle)

---

### LP-04 — Firestore security rules + test harness
**Est:** 1d · **Labels:** `security`, `infra`

Rules per §6, with tests. This is the one file where a plausible-looking mistake exposes
every agent's leads — the harness exists so every later change is verified, not assumed.

**Acceptance criteria**
- [ ] Rules implement §6 exactly for `users`, `slugs`, `profiles`, `profiles/*/blocks`,
      `publishedPages`, `leads`, `stats`
- [ ] `@firebase/rules-unit-testing` harness runs against the emulator
- [ ] Test: anonymous user CAN read `publishedPages`
- [ ] Test: anonymous user CANNOT write `publishedPages`
- [ ] Test: authenticated user CANNOT read another user's `profiles` or `blocks`
- [ ] Test: authenticated user CANNOT read another user's `leads`
- [ ] Test: **no client context can write `leads` at all**, including the owner
- [ ] Storage rules: writes scoped to `users/{uid}/*`, ≤10MB, image content-types only
- [ ] Rules tests run in CI and block merge on failure

---

### LP-05 — CI pipeline
**Est:** 0.5d · **Labels:** `infra`

**Acceptance criteria**
- [ ] GitHub Actions runs on every PR: typecheck, lint, unit tests, rules tests
- [ ] Firebase emulator starts in CI for the rules tests
- [ ] Build must succeed for the PR to be mergeable
- [ ] Total CI runtime under 5 minutes
- [ ] Branch protection on `main` requires CI green

---

### LP-06 — Vercel deployment and environments
**Est:** 0.5d · **Labels:** `infra`

**Acceptance criteria**
- [ ] Project connected to Vercel; `main` auto-deploys to production
- [ ] PRs get preview deployments
- [ ] Preview and development environments point at `leadport-dev` Firebase
- [ ] Production env vars set separately and not readable from preview builds
- [ ] `next/image` remote patterns allow the Firebase Storage bucket only
- [ ] Custom domain configured for production

---

### LP-07 — Error tracking
**Est:** 0.5d · **Labels:** `infra`

Solo means nobody else notices breakage (§12).

**Acceptance criteria**
- [ ] Sentry (or equivalent) capturing client, server-action, and route-handler errors
- [ ] Source maps uploaded so stack traces are readable
- [ ] Environment tag distinguishes preview from production
- [ ] Alert delivered to a channel you actually read
- [ ] PII scrubbing on: no lead names, emails, or phone numbers in error payloads

---

# Phase 1 — Auth and slug

### LP-08 — Google sign-in
**Est:** 1d · **Labels:** `auth`

Google only for v0 (§3) — email/password means a reset flow, verification email, and
account recovery support you'd carry alone.

**Acceptance criteria**
- [ ] "Continue with Google" completes sign-in and lands on the dashboard
- [ ] Auth state persists across reload and across tabs
- [ ] Sign-out clears state and redirects to the marketing page
- [ ] Popup-blocked and user-cancelled cases show a readable message, not a stack trace
- [ ] Works against the Auth emulator locally

---

### LP-09 — Protected dashboard routes
**Est:** 0.5d · **Labels:** `auth`

**Acceptance criteria**
- [ ] Unauthenticated access to `/dashboard/*` redirects to sign-in
- [ ] Post-sign-in, user returns to the route they originally requested
- [ ] Loading state shown while auth resolves — no flash of the sign-in page for a
      user who is already authenticated
- [ ] Public routes (`/`, `/[slug]`) remain reachable when signed out

---

### LP-10 — User document bootstrap
**Est:** 0.5d · **Labels:** `auth`

**Acceptance criteria**
- [ ] First sign-in creates `users/{uid}` with email, displayName, `plan: "free"`,
      `createdAt`
- [ ] Operation is idempotent — repeated sign-ins never duplicate or overwrite
- [ ] Runs server-side, not from the client
- [ ] Existing users are unaffected on subsequent logins

---

### LP-11 — Slug reservation
**Est:** 1d · **Labels:** `auth`, `security`

Uniqueness via a transaction on `slugs/{slug}` (§5). The blocklist matters — an agent
claiming `/api` or `/dashboard` breaks routing.

**Acceptance criteria**
- [ ] Slug claimed via Firestore transaction; concurrent claims cannot both succeed
- [ ] Format enforced: lowercase, 3–30 chars, `a-z0-9-`, no leading/trailing hyphen
- [ ] Input normalized to lowercase before check and write
- [ ] Reserved-word blocklist rejects at minimum: `api` `admin` `dashboard` `login`
      `signup` `about` `pricing` `terms` `privacy` `blog` `help` `support` `settings`
      `www` `app` `static` `_next`
- [ ] Live availability check in the UI, debounced
- [ ] Taken slug shows a clear message and suggests alternatives
- [ ] Releasing a slug (account deletion) frees it for reuse
- [ ] Test covers two simultaneous claims of the same slug

---

# Phase 2 — Template #1

### LP-12 — Template token contract
**Est:** 0.5d · **Labels:** `design`

Define how a template is expressed as data before writing one, so templates 2–5 are
config rather than forks (§8.2).

**Acceptance criteria**
- [ ] TypeScript type for a template: id, name, token set, font pairing, allowed
      accent ids, photo treatment
- [ ] Accent options are a fixed list per template, each with a pre-computed
      `accent-contrast` value
- [ ] Every accent × surface pairing passes WCAG AA (4.5:1 body, 3:1 large) — asserted
      by an automated test, not by eye
- [ ] `theme` on a profile stores `templateId` + `accentId` only, never raw hex (§5)
- [ ] Unknown or removed `templateId` falls back to the default without erroring

---

### LP-13 — Template #1 (the good one)
**Est:** 3d · **Labels:** `design`, `public`

The v0 template. Per §8.1 this is load-bearing: v0 exists to learn whether agents want
this, and an ugly page teaches you about your design instead of about demand.

Aesthetic target per §8.3 — professional, photographic, restrained. Closer to a
brokerage's brand than to an influencer link page.

**Acceptance criteria**
- [ ] Renders: cover, avatar, name, title, brokerage, bio, block stack, footer
- [ ] Mobile-first; verified on a real phone at 375px, not just a resized browser
- [ ] Body text ≥ 17px, tap targets ≥ 48px (§8.3)
- [ ] Avatar enforces a fixed aspect ratio and never distorts a non-square upload
- [ ] Any text over a photo sits on a gradient scrim and stays readable against a
      worst-case bright image
- [ ] Brokerage logo has a dedicated slot that looks deliberate when present and leaves
      no gap when absent
- [ ] Light and dark both complete
- [ ] Renders correctly with missing optional fields (no bio, no cover, no logo)
- [ ] Renders correctly with overflow content (40-char name, 500-char bio, 12 blocks)
- [ ] No hover-dependent affordances — everything works on touch
- [ ] Lighthouse mobile performance ≥ 90 on a representative profile

---

### LP-14 — Compliance footer
**Est:** 0.5d · **Labels:** `compliance`, `public`

Implements §10.1 and the EHO half of §10.2. Cheap to build, disqualifying to omit.

**Acceptance criteria**
- [ ] Renders agent name, each license as `{STATE} #{number}`, brokerage name,
      brokerage phone
- [ ] Equal Housing Opportunity logo rendered, with accessible alt text
- [ ] **Not removable or hideable by the agent** — no setting, no CSS escape hatch
- [ ] Present on the profile page and (later) every listing detail page
- [ ] Multiple licenses render cleanly (multi-state agents, §5)
- [ ] Optional brokerage address renders when present, omitted cleanly when not
- [ ] Legible in light and dark, meets AA contrast
- [ ] Reviewed against one target state's actual advertising rule before v0 ships

---

### LP-15 — Public block components
**Est:** 1d · **Labels:** `public`, `design`

Render-side components for the three v0 block types. Editor comes later (LP-20).

**Acceptance criteria**
- [ ] **Link block:** title, optional subtitle, optional icon; whole card is one tap
      target; external links get `rel="noopener noreferrer"`
- [ ] **Call/text block:** `tel:` and `sms:` deep links, US number formatting; verified
      on a real iPhone and Android (§12 — this is SMS/phone, not WhatsApp)
- [ ] **Form block:** rendered per LP-29
- [ ] Hidden blocks (`visible: false`) do not render and leak no markup
- [ ] Blocks render in `order` sequence
- [ ] Every block is keyboard reachable with a visible focus state
- [ ] Unknown block type renders nothing rather than crashing the page

---

# Phase 3 — Editor

### LP-16 — Dashboard shell
**Est:** 0.5d · **Labels:** `editor`

**Acceptance criteria**
- [ ] Persistent nav: Edit page, Leads, Settings
- [ ] Fully usable at 375px (§8.4 — agents edit from their phone between showings)
- [ ] Current section clearly indicated
- [ ] "View live page" link, disabled with explanation until first publish

---

### LP-17 — Profile identity form
**Est:** 1d · **Labels:** `editor`

**Acceptance criteria**
- [ ] Fields: name, title, bio, phone, email
- [ ] Zod validation with inline, human-readable errors
- [ ] Bio character limit shown with a live counter
- [ ] Changes write to the draft profile, never to `publishedPages`
- [ ] Unsaved-changes state is visible (pairs with LP-22)
- [ ] Every input has an associated `<label>`; form is keyboard-completable

---

### LP-18 — Licenses and brokerage form
**Est:** 1d · **Labels:** `editor`, `compliance`

The data behind LP-14. Multi-state support is required, not a nice-to-have (§5).

**Acceptance criteria**
- [ ] Add, edit, and remove multiple license entries (state, number, type)
- [ ] State is a dropdown of the 50 states + DC, not free text
- [ ] Brokerage sub-form: name, phone, address, optional license number, optional logo
- [ ] License number and brokerage name are **required to publish** (enforced in LP-23)
- [ ] Inline explanation of *why* these are required, linking to the concept, not a
      bare "required" error
- [ ] At least one license must remain; removing the last one is blocked
- [ ] Brokerage logo upload reuses LP-19

---

### LP-19 — Image upload, crop, and optimization
**Est:** 1.5d · **Labels:** `editor`, `infra`

Agents upload 4MB photos straight from their phone (§12). Handle it at the boundary.

**Acceptance criteria**
- [ ] Upload to `users/{uid}/...` in Firebase Storage
- [ ] Client-side crop with the aspect ratio enforced per image role (avatar square,
      cover wide)
- [ ] `storage-resize-images` extension installed; app consumes the resized derivative,
      not the original
- [ ] Accepts JPEG, PNG, WebP, HEIC; rejects everything else with a clear message
- [ ] Rejects >10MB before upload starts, not after
- [ ] Upload progress shown; failure is recoverable without losing form state
- [ ] Replacing an image deletes the previous original and derivatives (no orphans)
- [ ] Served through `next/image` with explicit width/height (no CLS)
- [ ] Alt-text field offered for every uploaded image (feeds §10.4)

---

### LP-20 — Block CRUD and reordering
**Est:** 1.5d · **Labels:** `editor`

**Acceptance criteria**
- [ ] Add a block from a type picker (link, call/text, form)
- [ ] Edit each type's config in a form appropriate to that type
- [ ] Delete with confirmation
- [ ] Show/hide toggle without deleting
- [ ] Drag to reorder on desktop **and** a keyboard/button alternative (up/down) that
      works on touch — drag alone fails accessibility and is awkward at 375px
- [ ] Reorder writes a fractional `order` value; no full-collection rewrite
- [ ] Link URLs validated and normalized (bare `agent.com` → `https://agent.com`)
- [ ] Empty state seeds example blocks to edit rather than a blank canvas (§8.4)

---

### LP-21 — Live preview
**Est:** 1.5d · **Labels:** `editor`, `design`

**Acceptance criteria**
- [ ] Desktop: preview beside the editor, in a phone-width frame
- [ ] Mobile: Edit/Preview tab switch (§8.4)
- [ ] Reflects draft state within ~300ms of a change
- [ ] Uses the *same* template components as the public page — a divergent preview is
      worse than none
- [ ] Preview shows the compliance footer so the agent sees what publishes
- [ ] Preview scroll position survives edits

---

### LP-22 — Draft autosave
**Est:** 1d · **Labels:** `editor`

**Acceptance criteria**
- [ ] Draft changes persist automatically, debounced ~1s
- [ ] Clear status: Saving / Saved / Save failed
- [ ] Failed save retries and surfaces a message if it keeps failing
- [ ] Navigating away with an unsaved change warns
- [ ] Autosave writes **only** to the draft — `publishedPages` is untouched until
      LP-23 runs (§4)
- [ ] Reload restores the draft exactly

---

# Phase 4 — Public page

### LP-23 — `publish()` server action
**Est:** 1.5d · **Labels:** `public`, `security`

Compiles draft → `publishedPages/{slug}` and revalidates (§4). The gate where
compliance becomes enforceable.

**Acceptance criteria**
- [ ] Server action reads draft profile + blocks, writes one compiled
      `publishedPages/{slug}` document
- [ ] Hidden blocks are excluded from the compiled output
- [ ] **Blocks publish** when license number or brokerage name is missing, with a
      message naming the missing field (§10.1)
- [ ] Verifies caller owns the profile — ownership from the session, never from the
      request body
- [ ] Calls `revalidateTag(slug)`; live page reflects changes within seconds
- [ ] Sets `publishedAt` and increments `version`
- [ ] Writing the compiled doc and updating profile status is atomic — no state where
      status says published but the page is stale
- [ ] Re-publishing is safe and idempotent
- [ ] Rules confirm no client can write `publishedPages` directly (LP-04)

---

### LP-24 — Public profile route with ISR
**Est:** 1d · **Labels:** `public`, `seo`

**Acceptance criteria**
- [ ] `/[slug]` renders from the single compiled document — one Firestore read (§4)
- [ ] `generateStaticParams` pre-renders known published slugs
- [ ] Cache tagged by slug so `revalidateTag` invalidates precisely
- [ ] Unknown slug returns a real 404 with correct status, not a soft 404
- [ ] Unpublished or draft-only profile returns 404, never leaks draft content
- [ ] `noindex` profiles emit the meta tag and stay out of the sitemap
- [ ] Verified: a second visitor within the cache window triggers **no** Firestore read

---

### LP-25 — SEO metadata
**Est:** 0.5d · **Labels:** `seo`

**Acceptance criteria**
- [ ] `generateMetadata` emits title, description, canonical, OG, and Twitter tags
- [ ] Agent-editable overrides; sensible generated defaults when blank
- [ ] Defaults incorporate name, title, and brokerage
- [ ] Tags present in **server HTML** (verified via `curl`, not devtools) — social
      scrapers don't run JS (§9)
- [ ] Canonical URL correct including trailing-slash behavior

---

### LP-26 — Structured data
**Est:** 0.5d · **Labels:** `seo`

**Acceptance criteria**
- [ ] JSON-LD `RealEstateAgent` (or `Person`) with name, image, telephone, url
- [ ] `worksFor` → brokerage `Organization`
- [ ] `areaServed` populated when the agent has provided it
- [ ] Passes Google's Rich Results Test with zero errors
- [ ] Emitted server-side
- [ ] No fabricated fields — omit rather than invent when data is absent

---

### LP-27 — OG image generation
**Est:** 1d · **Labels:** `seo`, `design`

US agents share via iMessage and Instagram DM; this card is the first impression (§9).

**Acceptance criteria**
- [ ] `next/og` route renders headshot, name, title, brokerage on the template accent
- [ ] 1200×630, correct content-type
- [ ] Fonts load correctly in the OG runtime (a common silent failure)
- [ ] Cached — not regenerated per request
- [ ] Graceful fallback when the agent has no photo
- [ ] Verified rendering in iMessage, WhatsApp, and at least one social debugger
- [ ] Long names truncate rather than overflow

---

### LP-28 — Sitemap and robots
**Est:** 0.5d · **Labels:** `seo`

**Acceptance criteria**
- [ ] `sitemap.ts` lists all published, non-`noindex` profile URLs with `lastModified`
- [ ] `robots.ts` allows public routes, disallows `/dashboard` and `/api`
- [ ] Sitemap referenced from robots.txt
- [ ] Generation doesn't read every profile document on every request (cached)
- [ ] Submitted to Google Search Console at launch

---

# Phase 5 — Lead capture

### LP-29 — Lead form block
**Est:** 1d · **Labels:** `leads`, `public`

**Acceptance criteria**
- [ ] Configurable heading, description, and button label
- [ ] Configurable fields — name, email, phone, message — each toggleable and
      individually required/optional
- [ ] Agent picks a purpose preset (Book a viewing / Home valuation / General inquiry)
      that sets sensible defaults
- [ ] Client-side validation with inline errors; server revalidates (LP-31)
- [ ] Submitting state disables the button and prevents double submission
- [ ] Success state confirms clearly and does not clear the page context
- [ ] Failure keeps the user's typed input intact
- [ ] Fully keyboard-navigable, labeled, AA contrast

---

### LP-30 — TCPA consent capture
**Est:** 0.5d · **Labels:** `leads`, `compliance`

Implements §10.3. The stored record is the entire point.

**Acceptance criteria**
- [ ] Consent checkbox appears whenever the form collects a phone number
- [ ] **Unchecked by default**, and separate from the submit action
- [ ] Plain-language text names who will contact them and by what means
- [ ] Stores `exactText` (the literal rendered string), `at`, `ip`, `userAgent`, and
      `smsOptIn` on the lead (§5)
- [ ] Changing the consent copy later does **not** alter previously stored records —
      covered by a test
- [ ] Consent state is visible on the lead in LP-34
- [ ] Copy reviewed by an attorney before v0 goes in front of real consumers

---

### LP-31 — `submitLead()` server action
**Est:** 1d · **Labels:** `leads`, `security`

**Acceptance criteria**
- [ ] Server action validates with Zod and writes via Admin SDK — never a client write
      (§6)
- [ ] `ownerUid` resolved server-side from the slug, never trusted from the request
- [ ] Captures `utm_*` params and referrer when present
- [ ] Rejects submissions for unknown, unpublished, or `noindex` profiles
- [ ] Field length caps enforced server-side (message ≤ 2000 chars)
- [ ] Email and phone normalized before storage
- [ ] Increments the daily `leads` counter via `FieldValue.increment()` (§5)
- [ ] **The lead is stored even if notification fails** (§4) — covered by a test that
      forces the mail call to throw

---

### LP-32 — Abuse protection
**Est:** 1d · **Labels:** `security`, `leads`

Public unauthenticated forms get found and hammered (§6).

**Acceptance criteria**
- [ ] Firebase App Check with reCAPTCHA enforced on the lead endpoint
- [ ] App Check debug token configured so local dev still works
- [ ] Rate limit per IP and per profile (e.g. 5/min, 30/hr) with a sane error
- [ ] Honeypot field silently discards bot submissions
- [ ] Rejections logged with enough context to tune thresholds
- [ ] Legitimate submission verified to pass cleanly end-to-end after all of the above

---

### LP-33 — Instant lead notification (email)
**Est:** 1d · **Labels:** `leads`

Speed-to-lead is the product (§12). Email only in v0 — see the SMS note below.

**Acceptance criteria**
- [ ] Email to the agent immediately on lead creation
- [ ] Sent via `waitUntil()` so the visitor never waits on the mail API (§4)
- [ ] Wrapped in `try/catch` — a send failure never fails the submission
- [ ] Email contains name, phone, email, message, which block, and the timestamp
- [ ] Phone and email are tap-to-call and tap-to-reply on mobile
- [ ] Reply-To set to the lead's email so the agent can just hit reply
- [ ] Send failures reach Sentry (LP-07)
- [ ] Delivery verified to Gmail, Outlook, and iCloud — not just one
- [ ] Sending domain has SPF/DKIM configured or these land in spam

> **SMS is deliberately out of v0.** US business SMS requires A2P 10DLC brand and
> campaign registration through the carriers — days to weeks of lead time, real cost,
> and its own compliance surface. Do not let it block the checkpoint. File it as a
> follow-up and ask agents at the v0 interviews whether email alone is sufficient.

---

### LP-34 — Minimal leads list
**Est:** 0.5d · **Labels:** `leads`, `editor`

Not the full inbox (that's v1). Just enough that a lead is never lost when a
notification is dropped (§4).

**Acceptance criteria**
- [ ] `/dashboard/leads` lists the signed-in agent's leads, newest first
- [ ] Shows name, phone, email, message, source block, timestamp, consent state
- [ ] Owner sees only their own leads (enforced by rules, verified by test)
- [ ] Empty state explains what will appear here
- [ ] Phone and email are tap-to-act on mobile
- [ ] Paginates or caps at a reasonable count — no unbounded read

---

### LP-35 — v0 checkpoint: agent interviews
**Est:** ~1 week elapsed, low effort · **Labels:** `epic`

Not a code issue, and the most valuable item in this document (§3, §13). Everything in
v1 is a guess until this is done.

**Acceptance criteria**
- [ ] 5–10 practicing US agents have a real published page, not a demo walkthrough
- [ ] Time-to-first-published-page measured for each (§8.4 target: under 10 minutes)
- [ ] Asked explicitly about the §10.7 buyer-agreement block — build only if it lands
- [ ] Asked whether email-only notification is sufficient or SMS is required (LP-33)
- [ ] Asked what they'd pay, framed against their existing Zillow/CRM spend (§2)
- [ ] At least one agent has shared their page with a real client
- [ ] Findings written up in `PLAN.md`; v1 scope revised before any v1 code is written

---

# v1 — epics *(expand after LP-35)*

### EPIC-A — Listing blocks and detail pages
**Labels:** `epic` · §3, §9

Listing CRUD with photo carousel, price, beds/baths/sqft, status badge; indexable
`/[slug]/listing/[id]` pages with `SingleFamilyResidence` + `Offer` structured data.
The biggest multiplier on indexed surface per agent.

**AC (high level):** listing CRUD · multi-photo upload and ordering · listing block on
the profile · detail page with ISR and structured data · compliance footer present ·
listings in the sitemap · status badge (Active / Under Contract / Sold).

---

### EPIC-B — Fair Housing language linter
**Labels:** `epic`, `compliance` · §10.2

Flags steering language in listing descriptions. Warn and explain, never auto-block.
Cheap to build, and nothing else in the category has it.

**AC (high level):** curated term list with per-term explanation · inline warnings as
the agent types · agent can dismiss and proceed · flags stored on the listing ·
**never blocks publish** · reviewed with an attorney.

---

### EPIC-C — Full leads inbox
**Labels:** `epic` · §3

Upgrade of LP-34: status workflow, filtering, search, CSV export, notes.

---

### EPIC-D — Templates 2–5 and theming
**Labels:** `epic`, `design` · §8.2

Additional templates as token sets, curated accent picker, template switcher that
preserves content. Every accent × surface pair must pass AA automatically (LP-12).

---

### EPIC-E — Analytics
**Labels:** `epic` · §5, §12

`/api/track` endpoint, `FieldValue.increment()` on daily buckets, dashboard showing
views, per-block clicks, leads, and conversion rate. The renewal mechanic.

---

### EPIC-F — vCard and QR
**Labels:** `epic` · §12

"Save my contact" vCard download; QR code for yard signs, open houses, business cards.

---

### EPIC-G — Accessibility pass (WCAG 2.1 AA)
**Labels:** `epic`, `compliance` · §10.4

Audit and fix across templates and dashboard. Fix once, every generated page inherits
it — a structural advantage worth marketing.

---

# v2 — epics

### EPIC-H — Billing
**Labels:** `epic` · §3

Stripe Checkout + customer portal, Free/Pro gating enforced in both rules and UI.
Price against Zillow spend, not Linktree (§2).

---

### EPIC-I — Lead routing and integrations
**Labels:** `epic` · §12

Outbound webhook, Zapier, Follow Up Boss push. A lead that dies in your inbox is
worthless.

---

### EPIC-J — Privacy and hardening
**Labels:** `epic`, `compliance` · §10.5

Privacy policy, data export, deletion, backups, performance budget enforcement in CI.

---

## Import to GitHub

These are written to paste directly into issues. To bulk-create, extract each `###`
block and pipe to:

```bash
gh issue create --title "LP-01 — Scaffold Next.js app with strict TypeScript" --body-file body.md --label setup
```

Ask if you want a script that parses this file and creates all 35 v0 issues with labels
and a milestone.
