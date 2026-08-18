# LeadPort — Implementation Plan

A link-in-bio platform for **US real estate professionals**. Public agent pages that
rank, load fast on mobile, look genuinely premium, and **capture leads** instead of
forwarding traffic away.

**Constraints this plan is built around:**

- **Market: United States.** Drives real requirements — state license display, Fair
  Housing, TCPA consent, ADA/WCAG. See §10; it's not boilerplate.
- **Team: one developer + Claude.** Every decision optimizes for _your_ time and _your_
  ops surface, not what a 5-person team would build.
- Ship something real to agents in ~3 weeks, not ~14.

> ⚠️ §10 is written from general knowledge of US real estate advertising rules. It is
> a checklist for a conversation with a real estate attorney, **not legal advice**.
> Rules vary by state and change; TCPA in particular has been actively litigated.

---

## 1. Stack: Next.js + Firebase, deployed on Vercel

**Next.js (App Router) + Firebase.** Firebase stays as your backend — Auth, Firestore,
Storage. Server-side logic lives in Next.js server actions rather than Cloud Functions
(§4), so React replaces the rendering layer _and_ absorbs the application layer.

Angular _can_ do SEO fine (`@angular/ssr` is real SSR with hydration). But four things
this product depends on are first-class in Next.js and hand-built in Angular:

| Need                                             | Next.js                                      | Angular                                         |
| ------------------------------------------------ | -------------------------------------------- | ----------------------------------------------- |
| Public pages static-fast but instantly updatable | ISR (`revalidateTag` on publish)             | No ISR equivalent — SSR per request, or rebuild |
| Property photos (heaviest asset, your LCP risk)  | `next/image` — server-side AVIF/WebP, srcset | `NgOptimizedImage` hints only, no transcoding   |
| Share previews for iMessage/IG                   | `next/og` — generated per agent              | Custom service + headless renderer              |
| Custom domains later                             | Middleware rewrite, ~15 lines                | Reverse proxy you maintain                      |

**Solo, this stops being close.** "Unless your team is Angular-fluent" doesn't apply
when Claude writes most of the code — pick the ecosystem with the most conventions and
training data behind it. Skip the Next.js-public/Angular-dashboard hybrid too: two
pipelines and two design systems is a team-sized cost.

**Hosting: Vercel for the app, Firebase for data/auth.** This deliberately flips the
usual "keep it in one console" advice. Firebase App Hosting runs Next.js, but you
configure image optimization and ISR yourself; on Vercel both are zero-config and
preview deploys come free. Two dashboards is trivial next to a lost day of infra
config — and infra config has no leverage when you're alone.

---

## 2. Positioning

The name is _LeadPort_. Leads are the product; links are the delivery mechanism.

1. **Lead capture inline.** Linktree's model sends traffic away. An agent needs the
   phone number.
2. **Listing blocks, not link blocks.** Photo carousel, price, beds/baths/sqft, status
   badge — with `schema.org` markup for rich results.
3. **Proof of ROI.** Per-link clicks, per-form conversion. The renewal mechanic.

**The US competitive frame.** Your buyer already pays Zillow Premier Agent,
Realtor.com, or a CRM like Follow Up Boss — often $300–1500/mo. Those are _rented_
leads: stop paying and they stop coming, and you never owned the relationship. Your
pitch is **owned leads** — traffic the agent already generates from their Instagram
bio, yard signs, and business cards, captured instead of leaking to Zillow's contact
form on their own listing.

That framing sets your price ceiling too: you're not competing with Linktree's $5/mo,
you're competing with a rounding error on their Zillow spend. Price like a business
tool ($19–49/mo), not a link tool.

Anything in §3 not serving one of the three points above is a candidate for cutting.

---

## 3. Scope — three releases, hard cuts

### v0 — "does anyone want this?" _(the only deadline that matters)_

- **Google auth only.** No email/password — that's a reset flow, a verification email,
  and an account recovery burden you'd carry alone.
- Slug reservation (`leadport.com/rodrigo-torrico`) + reserved-word blocklist
- Profile: photo, name, title, brokerage, bio
- **Compliance footer (§10): license number(s) + brokerage + EHO logo.** An afternoon
  of work, and without it serious agents can't use the product at all.
- **Three block types: link · call/text · lead form**
- **One template — but a genuinely good one (§8).** Not one theme _for now_; one
  template you'd be proud to show. See §8.1 for why this is load-bearing.
- Public page: ISR + full SEO + structured data + OG image
- Lead form → Firestore + **instant** email/SMS to the agent (speed-to-lead is the
  product, §12)
- Publish button

**Then stop and show it to 5–10 real agents.** Everything below is a guess until you
do. This checkpoint is the single most valuable thing in this plan.

### v1 — MVP

Listing blocks + listing detail pages · **Fair Housing language check (§10.2)** ·
leads inbox (list, mark contacted, CSV) · **3–5 templates + constrained theming
(§8.2)** · analytics counters · vCard "save my contact" · QR code · drag-to-reorder ·
WCAG 2.1 AA pass

### v2 — revenue

Stripe Checkout + portal · Free/Pro gating · outbound webhook + Zapier · CRM push
(Follow Up Boss first — widest adoption among independent agents)

### Deferred indefinitely — team-shaped

**Custom domains** (DNS tickets are a support product, not a feature) · native CRM
integrations beyond webhook/FUB · brokerage/team tier · i18n · A/B testing ·
**MLS/IDX import (§10.6)** · native app

---

## 4. Architecture

```
                 ┌─────────────────────────────────────────────────┐
  visitor ──────▶│ Next.js App Router (Vercel)                     │
                 │                                                 │
                 │  routes                                         │
                 │    /[slug]                ISR + revalidateTag   │
                 │    /[slug]/listing/[id]   ISR                   │
                 │    /dashboard/*           client, auth-gated    │
                 │                                                 │
                 │  server actions  (Admin SDK — all server logic) │
                 │    publish()      compile → write → revalidate  │
                 │    submitLead()   validate → store → notify     │
                 │                                                 │
                 │  route handlers                                 │
                 │    /api/track             FieldValue.increment  │
                 │    /api/webhooks/stripe   (v2)                  │
                 └────────┬────────────────────────────┬───────────┘
                          │ Admin SDK                  │ Client SDK
                 ┌────────▼─────┐             ┌────────▼───────┐
                 │  Firestore   │             │ Firebase Auth  │
                 │  Storage     │             │ App Check      │
                 └────────┬─────┘             └────────────────┘
                          │ trigger
                 ┌────────▼────────────────────────────────────────┐
                 │ Firebase Extensions — installed, not written    │
                 │   storage-resize-images                         │
                 │   firestore-send-email        (optional)        │
                 └─────────────────────────────────────────────────┘
```

**Key call #1 — draft/published split.** The editor writes a draft tree. The
`publish()` server action _compiles_ the page into one `publishedPages/{slug}`
document, then calls `revalidateTag(slug)`.

- Public render = **one** Firestore read, not `1 + N` for blocks
- With ISR that read happens per _publish_, not per visitor — costs stay flat
- Half-edited pages can't go live; rollback is trivial

**Key call #2 — no hand-written Cloud Functions.** Once Next.js runs on Vercel you
already have server-side execution with the Admin SDK:

| Plausible Function | What it should be                    | Why                                                                 |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------- |
| `compilePublish`   | `publish()` server action            | Fires on a button click — a request, not an event                   |
| `stripeWebhook`    | `/api/webhooks/stripe` route handler | Stripe only needs a URL                                             |
| `aggregateStats`   | _nothing_                            | `FieldValue.increment()` on the daily bucket **is** the aggregation |
| `notifyLead`       | inside `submitLead()`                | Already server-side (see caveat)                                    |

Firestore triggers exist to catch writes that bypass your server. Here both writes
that matter go through server actions, so there's nothing to intercept. Skipping them
buys one runtime, one deploy target, one log stream, one local-dev setup.

**The caveat — retries.** A trigger re-runs on transient failure; a server action that
throws is gone. Start with `waitUntil()` + `try/catch` inside `submitLead()` so the
**lead is always stored** even when notification fails. Move to the
`firestore-send-email` extension the first time you observe a dropped notification.

**Auth split:** public pages use the Admin SDK server-side. Dashboard uses the client
SDK — simpler than session cookies.

---

## 5. Data model (Firestore)

```
users/{uid}
  email, displayName, plan, stripeCustomerId, orgId?, createdAt

slugs/{slug}                        ← uniqueness via transaction
  profileId, ownerUid, reservedAt

profiles/{profileId}                ← DRAFT, owner-only
  ownerUid, orgId?, slug, status: draft|published
  identity: {
    name, title, phone, email, photoUrl, coverUrl, bio,
    licenses: [{ state: "TX", number: "0123456", type: salesperson|broker }],
    teamName?                       ← many states regulate team names in ads
  }
  brokerage: {                      ← REQUIRED in most states, §10.1
    name, licenseNumber?, phone, address, logoUrl?
  }
  compliance: {
    showEHO: bool (default true, not user-disableable),
    disclaimer?: string
  }
  theme: { templateId, accentId, mode }   ← constrained, not free-form (§8.2)
  seo:   { title, description, ogImageUrl, noindex }
  publishedAt, updatedAt

profiles/{profileId}/blocks/{blockId}
  type: link|calltext|form|listing|vcard|video|testimonial
  order (float — cheap reorder), visible, config: { ... }

publishedPages/{slug}               ← COMPILED, public read
  profileId, ownerUid, identity, brokerage, compliance, theme, seo,
  blocks[], version, compiledAt

listings/{listingId}
  ownerUid, address{}, price, beds, baths, sqft, status, photos[],
  description, fairHousingFlags[]   ← §10.2 linter output, warn-only

leads/{leadId}                      ← NEVER client-readable
  profileId, ownerUid, blockId, name, email, phone, message,
  consent: {                        ← this IS your TCPA defense record
    smsOptIn: bool, exactText: string, at, ip, userAgent
  },
  utm{}, referrer, status: new|contacted|qualified|closed, createdAt

stats/{profileId}/daily/{YYYYMMDD}
  views, clicks: { [blockId]: n }, leads
```

Get right now because they're painful later:

- **`licenses` is an array.** US agents are routinely licensed in multiple states
  (DC/MD/VA, NY/NJ, KC on the MO/KS line). A single string is a migration waiting.
- **Brokerage is an object, not a string.** Several states require its phone and
  address, not just the name.
- **`theme` stores ids, not values.** `templateId` + `accentId`, never raw hex (§8.2).
  Storing ids means you can improve a template and every page inherits the fix.
- Keep `orgId` even though nothing reads it — saves a migration when a brokerage wants
  50 seats.
- **Never write a doc per pageview.** `FieldValue.increment()` on the daily bucket.
- **Store consent as the exact rendered string**, not a boolean or version id. If you
  change the form copy, old records must still show what that person agreed to.

---

## 6. Security rules — verify these yourself, line by line

```javascript
match /publishedPages/{slug} {
  allow read: if true;
  allow write: if false;          // publish() server action, Admin SDK only
}

match /profiles/{profileId} {
  allow read, write: if request.auth.uid == resource.data.ownerUid;
  match /blocks/{blockId} {
    allow read, write: if get(/databases/$(database)/documents/profiles/$(profileId))
                            .data.ownerUid == request.auth.uid;
  }
}

match /leads/{leadId} {
  allow read:  if request.auth.uid == resource.data.ownerUid;
  allow write: if false;          // submitLead() server action only
}
```

Non-negotiable:

- Lead writes go through a server action, never a client write.
- **App Check + reCAPTCHA on the lead endpoint from day one.** Public unauthenticated
  forms get found and hammered.
- Storage rules: scoped to `users/{uid}/*`, size-capped, content-type-checked.
- Rules tests (`@firebase/rules-unit-testing`) committed alongside the rules.

Leads contain names, phone numbers, and consent records — this is the one file where a
bug is a breach with regulatory exposure, not a bug.

---

## 7. Working with Claude on this

**Delegate freely:** CRUD scaffolding · security rules _and their tests_ ·
`schema.org` + metadata · Tailwind components from a spec · Zod schemas and validation
· migration and seed scripts · CSV export · sitemap/robots · the Fair Housing term
linter (§10.2)

**Verify yourself, every time:**

- **Security rules.** Read every line, run the tests.
- **Anything touching money** — Stripe webhooks, plan gating, idempotency.
- **Everything in §10.** Claude can draft consent language and assemble the checklist;
  an attorney confirms it. State advertising rules are genuinely state-by-state and
  TCPA has been actively litigated — treat any specific claim, including mine, as a
  starting point to verify.
- **Visual judgment (§8).** Claude writes good component code from a clear spec but
  can't see the result. _You_ look at every screen on a real phone.
- **Product cuts.** What to build is your call.

**Weakest here:** production bugs you can't reproduce, DNS/deploy debugging, real spam
patterns, and what US agents will actually pay for.

**Practices that pay for themselves solo:**

- Run `/init` once there's code — a `CLAUDE.md` keeps future sessions consistent.
- Keep this `PLAN.md` current. It's how a fresh session reloads context in six months.
- Firebase **emulator suite** — lets Claude run and test rules and server actions.
- Small commits with real messages.

---

## 8. Design & UX

Design isn't polish on this product — for a link-in-bio tool it substantially _is_ the
product. Agents choose it to look credible in front of clients.

### 8.1 Two surfaces with opposite goals

|               | Public agent page                  | Dashboard / editor             |
| ------------- | ---------------------------------- | ------------------------------ |
| Must be       | **Beautiful**                      | **Obvious**                    |
| Audience      | The agent's clients                | The agent, once a month        |
| Judged on     | Does this agent look professional? | How fast can I publish?        |
| Design effort | **~80%**                           | **~20%**                       |
| Failure mode  | Looks cheap → agent won't share it | Confusing → they never publish |

Conflating these is the common mistake. The public page deserves real craft; the
dashboard deserves ruthless step-removal and nothing fancier.

**Why v0 needs one _genuinely good_ template, not a placeholder.** v0's entire purpose
is learning whether agents want this. If you show them something ugly, you learn about
your design, not about demand — you'll get false negatives and won't know it. One
excellent template beats five mediocre ones for that conversation, and it's less work.

### 8.2 Templates, not a color picker

**The core product decision: agents cannot design, and every ugly page they publish is
a billboard for your product.** Give them a color picker and font dropdown and you'll
get purple-on-orange Comic Sans pages carrying your name.

Constrain it:

- **Pick a template** (3–5 by v1) — full layouts, professionally composed
- **Pick an accent** from a curated set per template, each pre-validated for contrast
- **Upload a photo, type your text.** That's the whole surface.

Squarespace beat Wix on exactly this. It also makes WCAG AA contrast (§10.4)
_structural_ rather than something you validate and reject — no user input can produce
a failing combination, so there's no error state to design. And storing `templateId` +
`accentId` (§5) means improving a template silently upgrades every page already live.

### 8.3 Real estate design constraints

These differ from the Linktree/Beacons aesthetic in ways that matter:

- **Professional, not playful.** Your competitors' visual language is influencer-y.
  An agent's page sits next to their brokerage's brand and represents the largest
  transaction of their client's life. Restrained, photographic, trustworthy.
- **Photography is the hero.** Templates must flatter a headshot shot on a phone:
  enforced aspect ratios, built-in crop, and gradient scrims so text over property
  photos stays readable. Never place live text on an unscrimmed photo.
- **Agents skew older than Linktree's users.** Minimum 17–18px body text, 48px tap
  targets, high contrast, no clever gestures, no hover-dependent affordances.
- **Brokerage logo has to fit without looking bolted on** — Compass, KW, RE/MAX and
  eXp all have brand guidelines their agents must respect. Design a proper slot for it
  (this pairs with the §10.1 compliance footer).
- **Mobile is ~90% of traffic.** Design mobile-first and check desktop second, not the
  reverse.

### 8.4 Editor UX

- **Live preview beside the form** on desktop; tab-switch on mobile. Non-negotiable —
  every competitor has it and agents expect it.
- **Agents will edit from their phone.** They live on their phone between showings.
  The editor must be fully usable at 375px, not merely responsive.
- **Time-to-first-published-page is your activation metric.** Target under 10 minutes
  from signup. Instrument it; it's the number that tells you if onboarding works.
- **Autosave the draft, explicit Publish** (already how §4 works — surface it clearly
  so agents trust that editing isn't live).
- **Empty states that teach.** A new page pre-seeded with example blocks the agent
  edits beats a blank canvas with an "Add block" button.

### 8.5 Stack

Tailwind + **shadcn/ui** (already in Phase 0) is the right call solo: you own the
component code, there's no runtime dependency, and Claude knows both deeply. Beyond
that:

- **Design tokens from day one** — CSS variables mapped into the Tailwind theme.
  Templates become token sets, not forked components. Retrofitting this later is
  painful and it's ~an hour now.
- **Don't build a component library.** Compose shadcn primitives.
- `next/font` self-hosted; 2 font families max per template.

### 8.6 On UI UX Pro Max

I looked at the site. It's an open-source Claude Code skill — a searchable database of
57 UI styles, 95 color palettes, 56 font pairings, landing patterns, and UX guidelines,
with stack-specific guidance including Next.js and Tailwind.

**Where it genuinely helps you:** you're solo and not a designer, and §8.2 requires you
to produce 3–5 curated palettes and font pairings that don't look amateur. That's
exactly what this database is for. Use it to source **template palettes and type
pairings**.

**Two cautions, both real:**

1. **Its headline styles are trend aesthetics** — glassmorphism, neumorphism,
   claymorphism, aurora, brutalism. Those are close to the opposite of what §8.3 calls
   for. Neumorphism in particular is low-contrast by construction and will fight your
   WCAG AA requirement, and glassmorphism over property photos hurts text legibility.
   If you use it, pull from the restrained/professional end and ignore the demo gallery
   aesthetic. It has a real estate demo category — look at that one first, and judge it
   against §8.3 rather than adopting it.
2. **It's a third-party skill, so installing it means letting someone else's
   instructions shape what Claude does in your repo.** It's open source, which is the
   good case — read the `SKILL.md` and any scripts on GitHub before installing rather
   than after. Not alarmism, just the same diligence you'd give any dependency.

**Net: worth trying as a palette/typography reference. Don't let it pick the product's
aesthetic direction — §8.3 does that.** It also won't help with §8.4, which is the
harder design problem here.

---

## 9. SEO plan

- **Rendering:** `generateStaticParams` over known slugs + ISR. `revalidateTag(slug)`
  on publish — edits live in seconds, visitors still get static HTML.
- **Metadata:** `generateMetadata` per slug. Agent-editable, sane defaults.
- **Structured data:**
  - `RealEstateAgent` / `Person` + `worksFor` → `Organization` (the brokerage)
  - Per listing: `SingleFamilyResidence` + `Offer` (price, availability)
  - `areaServed` on the agent — feeds local intent
- **OG images** via `next/og`. US agents share via iMessage and Instagram DMs; those
  scrapers don't run JS, so tags must be in server HTML.
- **Sitemap:** dynamic from published slugs + listing pages. `noindex` per profile.
- **Budget:** LCP < 2.0s on 4G mobile. Above-fold = avatar + name + first 2 blocks,
  priority-loaded. `next/font` self-hosted, `display: swap`.
- **Listing detail pages** (`/[slug]/listing/[id]`) — separate indexable URLs where
  long-tail address searches land. Biggest multiplier on indexed surface per agent.

**Honest US caveat:** an agent's profile page mostly ranks for their own name. Queries
like "realtor in Round Rock TX" are dominated by Google Business Profile, Zillow, and
Realtor.com — you will not outrank those with a link-in-bio page and shouldn't promise
agents you will. Your SEO value is (a) owning their name query, (b) listing detail
pages catching address searches, (c) being the fast, correct destination for traffic
they already drive. Sell it that way.

---

## 10. US compliance — the section that makes this defensible

Most of this is cheap to build and expensive to omit. It's also the clearest wedge
against Linktree, which cannot ship any of it.

### 10.1 License and brokerage display — **v0, blocking**

Most states require licensees to include their **license number** and their
**brokerage's name** in advertising; many require the brokerage displayed as
prominently as the agent. Some require brokerage phone/address, and several regulate
**team names** in ads.

Build it as structured fields (§5) rendered into a footer the agent cannot delete,
present on the profile page and every listing detail page.

Don't try to encode 50 states in v0. Ship one compliant default — agent name, license
number(s) + state, brokerage name, brokerage phone, EHO logo — which satisfies the
common denominator. Add per-state variation only when agents ask.

Why it's blocking: brokerages have compliance staff who review agent advertising. A
page missing these puts the _agent's_ license at risk. Not a weaker product to them —
an unusable one.

### 10.2 Fair Housing — **v0 footer, v1 linter**

- **Equal Housing Opportunity logo** in the footer. Non-disableable.
- **Fair Housing language check on listing descriptions (v1).** Flag terms referencing
  protected classes or steering — "perfect for a young family", "safe neighborhood",
  "walking distance to [church]", "ideal for singles", "no kids". Warn and explain,
  never auto-block: the agent decides, you educate. Genuinely differentiating — agents
  fear these complaints and no link-in-bio tool helps. It's text-matching against a
  curated term list: cheap, and exactly the kind of thing to hand Claude.
- **Never build audience targeting or demographic filtering.** HUD pursued Facebook
  over discriminatory housing ad delivery. Any feature letting an agent show different
  housing content to different audiences is a landmine — stay out.

### 10.3 TCPA consent — **v0**

If a form collects a phone number and the agent will call or text:

- Unchecked-by-default checkbox, separate from the submit action
- Plain-language text naming who will contact them and how
- Store **exact text + timestamp + IP + user agent** with the lead (§5)

Store the record even if unsure it's required — one Firestore field, and the only
thing that helps if a claim arrives. TCPA rules around lead-gen consent have been
through significant rulemaking _and_ litigation recently; have your attorney confirm
current state rather than trusting any summary, including this one.

### 10.4 Accessibility (ADA / WCAG 2.1 AA) — **v1**

Real estate sites are a recurring target of US ADA web accessibility claims. Since you
generate thousands of agent pages from a handful of templates, **you fix it once and
every page inherits it** — a real structural advantage individual agents on Wix don't
have. Bake in: semantic HTML, keyboard nav, alt text on every uploaded photo (prompt
the agent), visible focus states, and contrast guaranteed by §8.2's constrained
palettes rather than validated after the fact.

### 10.5 Privacy — **v1/v2**

Privacy policy, data export, deletion. CCPA/CPRA plus the growing patchwork of state
privacy laws — most share a common core (notice, access, deletion, opt-out of sale).
Build to that core, not per-state branches. You're a **processor** for the agent's
leads and a **controller** for agent account data; your ToS should say so.

### 10.6 MLS / IDX — **not now, possibly not ever solo**

Auto-importing listings sounds obvious and is the biggest trap here. Every MLS has its
own participation agreement, display and attribution rules, and approval process;
access is per-MLS even where RESO standardizes the API. Nationwide coverage means
hundreds of individual agreements. **Manual listing entry for v1.** Revisit only with
revenue and a lawyer.

### 10.7 Post-NAR-settlement opportunity — validate at the v0 checkpoint

Since the 2024 NAR settlement changes, US buyer's agents generally need a **signed
written buyer agreement before touring homes**. That's new friction in every agent's
workflow, and a "review & sign my buyer agreement" block on a page they already send
to every prospect is a plausibly strong fit. Ask about it during your v0 interviews
before building — if it lands, it's a sharper wedge than anything on the v1 list.

### 10.8 Your liability posture

The licensee is responsible for their own advertising compliance, not the platform.
Your ToS should say so clearly. But **make it easy to be right** — required fields,
sensible defaults, the linter — and say so in your marketing. "Built for compliance"
is a real reason an agent picks you over Linktree.

---

## 11. Roadmap

Estimates assume Claude writing most code. Two columns because they're very different
projects:

| Phase                      | Work                                                                                                          | Full-time    | Nights (~12h/wk) |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ | ---------------- |
| **0. Foundations**         | Next.js + TS strict, Tailwind + shadcn/ui, **design tokens (§8.5)**, Firebase dev/prod, emulators, Sentry, CI | 4 days       | 1.5 wks          |
| **1. Auth + slug**         | Google auth, protected routes, user bootstrap, slug reservation + blocklist                                   | 2–3 days     | 1 wk             |
| **2. Template #1**         | One excellent public template (§8.1–8.3): layout, type, palette, photo treatment, compliance footer slot      | 3–4 days     | 1.5 wks          |
| **3. Editor (thin)**       | Profile + brokerage/license fields, image upload + crop, link / call-text / form blocks, live preview (§8.4)  | 5 days       | 2 wks            |
| **4. Public page**         | `publish()` server action, ISR route, compliance footer (§10.1–10.2), all of §9                               | 4 days       | 1.5 wks          |
| **5. Lead capture**        | `submitLead()` + App Check + rate limit, TCPA consent (§10.3), instant notify                                 | 3 days       | 1 wk             |
|                            | ⏸ **v0 — show it to 5–10 agents** (ask about §10.7)                                                           | **~3.5 wks** | **~8 wks**       |
| **6. Listings**            | Listing CRUD, carousel, detail pages, structured data                                                         | 1 wk         | 2.5 wks          |
| **7. Fair Housing linter** | Term list, inline warnings, explanations (§10.2)                                                              | 2 days       | 0.5 wk           |
| **8. Leads inbox**         | Table, status, CSV export                                                                                     | 3 days       | 1 wk             |
| **9. Templates 2–5**       | Additional templates + accent sets, template switcher (§8.2)                                                  | 1 wk         | 2.5 wks          |
| **10. Analytics**          | `/api/track`, counter aggregation, simple dashboard                                                           | 3 days       | 1 wk             |
| **11. vCard + QR**         | Contact download, QR generation                                                                               | 1–2 days     | 0.5 wk           |
| **12. A11y pass**          | WCAG 2.1 AA audit + fixes (§10.4)                                                                             | 3 days       | 1 wk             |
|                            | **v1 — MVP**                                                                                                  | **~8 wks**   | **~17 wks**      |
| **13. Billing**            | Stripe Checkout + portal, plan gating                                                                         | 4 days       | 1.5 wks          |
| **14. Hardening**          | Privacy policy, export/delete, legal pages, backups, perf budget                                              | 4 days       | 1.5 wks          |
|                            | **v2 — revenue**                                                                                              | **~9.5 wks** | **~20 wks**      |

Where you _do_ want a Function, install an Extension rather than authoring one:
`storage-resize-images` (you'll need it), `firestore-send-email` (only if you hit
dropped notifications), `firestore-stripe-payments` (evaluate at v2 — don't
pre-commit).

---

## 12. What you're missing

Your original list — auth, links, personalization, picture — is the Linktree clone
floor. Gaps by impact:

**The single most important thing: lead capture with instant notification.** It's the
only item that changes the unit of value from _a page_ to _a pipeline_. Listings
without capture just route visitors to Zillow — a prettier referral into someone
else's lead gen. Analytics measures leads; no leads, nothing to measure. And it isn't
"add a contact form" — it's **speed-to-lead**. In US real estate the agent who responds
first usually wins the client, which is why they pay for lead products at all. The
notification path _is_ the feature; a lead sitting unseen for six hours is worth
roughly nothing. That's why §4's retry caveat matters more than it looks.

**Then, in order:**

1. **License + brokerage display (§10.1).** Highest ROI in the plan — an afternoon that
   moves you from unusable to usable for professional agents.
2. **Design quality as a feature, not a phase (§8).** You flagged this and you were
   right; it's why Template #1 is now its own roadmap line before the editor.
3. **Listing blocks with real fields.** Without them it's a link tool with a house icon.
4. **Analytics.** "142 views, 31 clicks, 6 leads" is the renewal mechanic.
5. **Fair Housing linter (§10.2).** Cheap, and nothing else in the category has it.
6. **vCard "save my contact".** One tap into the phone's address book.
7. **QR codes.** Yard signs, open houses, business cards — more US real estate traffic
   starts offline than you'd expect.
8. **Call/text block.** In the US this is SMS and phone, not WhatsApp. Keep WhatsApp as
   an option for agents serving international or Spanish-speaking buyers; don't default
   to it.
9. **CRM push.** A lead that dies in your inbox is worthless. Follow Up Boss first,
   then generic webhook + Zapier.
10. **Error tracking (Sentry) day one.** Solo means nobody else notices breakage.
11. **Image pipeline.** Agents upload 4MB photos from their phone — a failed mobile LCP
    and a bandwidth bill at once.
12. **Spam/abuse.** App Check, rate limit, honeypot. You get paged.
13. **Billing.** Free tier for acquisition; Pro for analytics, unlimited listings, and
    removing LeadPort branding. Price against Zillow spend (§2), not Linktree.

A test worth holding the roadmap against: **does this help an agent get a phone number
faster?** Most feature ideas fail it — a decent signal about ordering.

---

## 13. Risks

| Risk                                                 | Mitigation                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Building 8 weeks of features nobody wants**        | The v0 checkpoint in §11. Non-negotiable.                                                                                             |
| **Ugly v0 produces false-negative feedback**         | One excellent template before the editor (§8.1). You cannot learn about demand through a bad first impression.                        |
| **Agents publish ugly pages that damage your brand** | Templates + curated accents, never free-form color (§8.2).                                                                            |
| **Scope creep — no teammate to push back**           | No new features until 10 agents are actively using it. Write it down.                                                                 |
| **Support burden**                                   | Every free user is unpaid support you answer personally. Small free tier or paid-only trial. This is why custom domains are deferred. |
| **Compliance mistake harms an agent's license**      | §10 defaults non-disableable; ToS puts responsibility on the licensee; attorney review before launch.                                 |
| **ADA claim against generated pages**                | Fix once in the template, inherited everywhere (§10.4). Structural advantage — use it.                                                |
| **Context loss between sessions**                    | `PLAN.md` + `CLAUDE.md` + decisions in-repo.                                                                                          |
| **Lead spam floods agent inboxes**                   | App Check + reCAPTCHA + rate limit, day one.                                                                                          |
| **Firestore read costs**                             | ISR + compiled single-doc page — reads scale with publishes, not visitors.                                                            |
| **Linktree ships real estate templates**             | They won't ship §10. Compliance + lead routing is the moat, not the link list.                                                        |
| **Agents expect you to outrank Zillow**              | Set expectations at sale time (§9 caveat). Overpromising SEO is the fastest route to churn.                                           |

**Still open:**

1. **Full-time or nights?** Picks your column in §11.
2. **Which state or metro first?** Starting concentrated makes §10.1 much easier to get
   right and gives you a referral network among agents who know each other.
