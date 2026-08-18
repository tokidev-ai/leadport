# LeadPort

Real estate link-in-bio with lead capture. See [PLAN.md](PLAN.md) for product and
architecture, [ISSUES.md](ISSUES.md) for the backlog, [CLAUDE.md](CLAUDE.md) for
the working rules on this repo.

## Local setup

1. Install Node 20+ and npm. The Firebase emulators need a JDK 21+ on `PATH`
   (`brew install openjdk@21` on macOS; it's keg-only, so also export
   `JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home`
   and prepend `$(brew --prefix openjdk@21)/bin` to `PATH`).
2. `npm install`
3. `cp .env.example .env.local`, set the `NEXT_PUBLIC_FIREBASE_*` values to
   `leadport-dev`'s config (Firebase console → Project settings → your web
   app), and set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.
4. `npm run emulators` — Auth + Firestore + Storage, UI at
   http://127.0.0.1:4000
5. `npm run dev` (separate terminal) — app runs at http://localhost:3000
6. `npm run typecheck` / `npm run lint` / `npm run format` / `npm run build`

## Firebase projects

Two projects: `leadport-dev` and `leadport-prod` (aliased in `.firebaserc`).
Firestore is provisioned on both (`nam5`, US multi-region). Two things need a
one-time manual step in the Firebase console per project — no CLI/API path
exists for either:

- **Storage**: console → Storage → "Get Started", once per project. Not
  needed for local dev (the Storage emulator runs fine without a real
  bucket) — only for anything that touches the real project.
- **Auth providers**: console → Authentication → Sign-in method → enable
  Google. v0 is Google-only (see PLAN.md §3).

For a deployed environment (not local dev), the Admin SDK needs a real
service account: console → Project settings → Service accounts → Generate
new private key, then set the downloaded JSON as `FIREBASE_SERVICE_ACCOUNT_KEY`
directly in the hosting platform's secret store — never in a file in this
repo.
