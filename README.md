# PayHalo — Your legacy, considered.

A working prototype of the **Dormant Billion** idea from *Dawnik Lab Team 1 (PRD)*: a calm, verified
handover for a digital life lived across PayPal balances, crypto wallets and online businesses.

> If something happened to you today, would your family know where your money lives — or how to
> get it?

PayHalo lets someone decide *who gets what, in what order* while they are well, name a trusted keyholder
who can start a claim, and give their family a plan instead of a puzzle. Nothing is released before a
document has been verified **and** the account holder has had **14 full days** to respond.

**Live: <https://hack1-weld.vercel.app>** — sign up and you get your own empty plan. No shared
household, no sample data, nothing visible to anyone else.

**Judging this project? [`docs/DEMO.md`](docs/DEMO.md)** has the run instructions, a five-minute pass
through the product and the three-minute video script. The short version: `npm install && npm run dev`
works with no configuration at all.

Sign-in is PayHalo's own: an email and password (scrypt), or a one-time emailed link, stored in
`vivo_users` / `vivo_sessions` / `vivo_login_tokens`. A forgotten password is reset through its own
one-time emailed link — see [Forgot password](#forgot-password). Supabase is the database, not the identity
provider. Each account owns exactly one plan, stored as one row in `public.vivo_docs` keyed by
`vivo_users.id`; the server never reads across owners. Keyholders and beneficiaries are given
**signed links** (HMAC, `VIVO_SHARE_SECRET`) rather than accounts, and each link is scoped to one
audience on the server.

---

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run typecheck # tsc --noEmit
npm run lint      # eslint .
```

Requires **Node 22+**. Locally, state persists to `data/hack1.db`; on Vercel it runs against Supabase
(see [Storage](#storage)).

---

## The design system

PayHalo is one art-directed product, not a set of screens. Every page is built from the same token layer
(`app/globals.css`) and the same primitives (`components/ui.tsx`).

| Token | Value | Used for |
|---|---|---|
| Forest | `#153F35` | Hero surfaces, primary actions, estate cards |
| Brand | `#008477` | Links, eyebrows, focus, interaction |
| Lime | `#D9F4A5` | One "this matters" card per page, progress |
| Mint | `#EBF2E9` | Active nav, quiet reassurance, secondary surfaces |
| Canvas | `#F3F6F2` | App background |
| Surface | `#FFFFFF` | Cards |
| Ink | `#172D29` | Text |
| Muted | `#62716A` | Secondary text |

- **Type:** Manrope for display and numbers, Inter for UI, labels and body. Eyebrows are 10px,
  uppercase, 0.14em tracked.
- **Scale:** 4→64px spacing; cards at ~20px radius, controls at 12px.
- **Rules:** soft borders, restrained shadows, no gradients, no glassmorphism. Lime appears once per
  view; forest carries weight; teal carries interaction.
- **Shell:** fixed white sidebar (logo, "Your personal legacy", six primary destinations, secondary
  profile/help, forest "On your terms." promo, signed-in identity), a 64px top bar ("Personal
  workspace", "Private by design", a *Private workspace* marker and **Sign out**), and a real mobile
  drawer — not a squeezed sidebar.

---

## Screens

| Route | Role | What it does |
|---|---|---|
| `/` | — | The story, the three pillars, the 14-day promise, and a door into each portal |
| `/onboarding` | Owner | 8-step story-first setup: identity → assets → primary → backups + split → cause → keyholder → seal |
| `/dashboard` | Owner | Estate card with distribution bar, live plan-progress card, asset table, "Protected by time.", the order of care |
| `/assets` | Owner | Three summary cards, searchable and type-filterable working list |
| `/assets/new` | Owner | Type cards with a mint/teal selected state, type-dependent fields, "A record, not a transfer." |
| `/assets/[id]` | Owner | Forest value card with type-appropriate metrics only, handover instructions, supporting documents |
| `/assets/[id]/edit` | Owner | Edit or remove the record (removal is confirmed and dated) |
| `/beneficiaries` | Owner | Forest first-choice card, editable backup shares, final cause, "How the order works" |
| `/plan` | Owner | Lime banner, 01–04 section cards, live checklist, seal action, "Life happens. Pause here." |
| `/documents` | Owner | Guidance records with search, access level, and upload |
| `/activity` | Owner | Grouped trail with category filters; a claim in its registry check never appears |
| `/settings` | Owner | Profile form, account email, **share links** for keyholder and beneficiary, PayPal, what PayHalo never asks for |
| `/help` | Owner | FAQ, support request, the safety notice in four steps |
| `/keyholder` | Keyholder | Role home → claim intake (code, evidence, confirmation) → review → window → complete |
| `/keyholder/support` | Keyholder | Same help content, keyholder frame |
| `/beneficiary` | Beneficiary | Quiet → safety window (days remaining) → released entitlement and instructions |
| `/beneficiary/support` | Beneficiary | Same help content, beneficiary frame |
| `/plan/sheet` | Owner | The printable instruction sheet the whole product exists to produce |

---

## Roles, enforced by architecture

Route groups give each portal its own layout, and each layout receives a **different, already-scoped
read** — the portals are not the same data hidden with CSS. The owner is a real session; the other two
audiences are signed links, verified on every request by `lib/share.ts` and resolved to an owner id by
`lib/scope.ts`. No link, wrong audience, or tampered signature renders `PortalGate` and nothing else.

| Role | Receives | Cannot receive |
|---|---|---|
| Account holder (`app/(app)`) | `getSnapshot("owner")` — the full plan | A claim still inside its 72-hour registry check |
| Keyholder (`app/(keyholder)`) | `getKeyholderView()` — owner name, plan status, claim clocks, verification transcript, audit titles | Balances, asset details, recipient names or shares, documents |
| Beneficiary (`app/(beneficiary)`) | `getBeneficiaryView()` — their own identity, the window clock, and (only after release) their own entitlement, their note and documents marked for beneficiaries | The estate, other recipients, anything before the full 14 days |

`GET /api/keyholder` returns only the keyholder view, so even the client refresh path cannot fetch
the owner snapshot.

The rules the product will not break:

- The account holder owns, edits and seals the plan, and can stop a handover during the window.
- A keyholder can initiate a claim and submit evidence. Nothing else, at any stage — including after
  release.
- A beneficiary sees only their own entitlement, and only after verification plus 14 full days.
- Nothing is released before 14 full days. Ever.
- PayHalo never asks for a password, private key or recovery phrase, and no portal can display one.

---

## A walkthrough

1. **`/`** → *Get started* → **`/signup`**. Name, email, password. You land in `/onboarding` with a
   brand-new, empty plan. `/signin` takes either the password or a one-time emailed link.
2. **`/onboarding`** (or *Add an asset* from the dashboard) — name what you hold, who gets it, and the
   instructions a keyholder would need. Balances are figures you type, not figures PayHalo reads.
3. **`/settings` → Sharing** — copy the keyholder link to the person you trust, and the beneficiary link
   to each recipient. Both are signed; replacing them invalidates the old ones.
4. Open the **keyholder link** in a private window: owner name, claim status, clocks — no balances, no
   assets, no names of other recipients. Start a claim, attach a certificate: the document is read for
   real (structure, text layer, name, certificate number, registrar), and a Gumroad receipt is refused
   with reasons.
5. **Filing puts the claim into a 72-hour registry check.** The keyholder sees the countdown; the owner
   sees nothing at all — no pill, no banner, no trail entry.
6. After the check, the owner's dashboard shows the forest safety-window card with the 14-segment clock
   and a stop control. A beneficiary link during the window shows days remaining and **no amounts**.
7. When the window closes with no response, `/beneficiary` shows that person's own entitlement only;
   `/keyholder` still shows no balances, and says so.

Nothing can be fast-forwarded. There is no reset, no seeded household and no demo clock: the 72 hours
and the 14 days are real elapsed time.

## Architecture

```
Next.js 15 App Router (async server components read state directly)
        │
        ├── app/(app)/         owner shell  → getSnapshot("owner")
        ├── app/(keyholder)/   keyholder shell → getKeyholderView()
        ├── app/(beneficiary)/ beneficiary shell → getBeneficiaryView()
        ├── app/(paper)/       printable instruction sheet
        ├── lib/store.ts       async facade: load → settle → save, plus the scoped reads
        ├── lib/model.ts       state document, seed, every mutation, role-scoped views
        ├── lib/engine.ts      allocation rules (pure)
        ├── lib/certs.ts       certificate verification: bytes → verdict, checks, fields
        └── lib/storage/       drivers: supabase · kv · sqlite · memory
```

**Engine rule** (`lib/engine.ts`), executed when a verified claim's safety window ends:

1. Primary beneficiary reachable → receives 100%.
2. Otherwise the reachable backups split the estate by their weights.
3. Otherwise the designated final cause receives everything.

Integer-cent arithmetic, remainder to the last recipient, and every step appends to an immutable
event trail.

**Certificate verification** (`lib/certs.ts`). The upload is read, not assumed: file signature vs.
extension, size, PDF structure, text layer, document title, the fields a certificate carries, the
deceased's name against the plan owner, certificate-number format, date sanity, known-registry match,
tamper signals, and a SHA-256 duplicate check. Twelve checks, three verdicts:

| Verdict | Meaning | What happens |
|---|---|---|
| `verified` | every automated check passed | claim can be filed → 72-hour registry review |
| `needs_review` | soft signals only (a photo, no text layer, unknown registrar) | claim can be filed → 72-hour human review |
| `rejected` | a critical check failed | the claim cannot be filed; reasons are shown |

The server re-runs the whole check inside `POST /api/claim`, so a client cannot talk it into accepting
a document. A generic image or receipt is refused, never approved by filename.

**The 72-hour gate.** A filed claim starts in `review` with `reviewEndsAt = now + 72h`. Its event is
recorded as `ownerVisible = 0`, so the owner snapshot and trail are untouched. When the check clears,
the claim becomes `window`, `verifiedAt` is stamped, the owner is notified, `windowEndsAt =
verifiedAt + 14 days`, and only then can the engine release anything. *Fast-forward* moves one clock
per press; a live system waits for the registrar.

### API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/onboarding` | Create/replace a sealed plan |
| POST | `/api/auth/forgot` | Email a one-time password-reset link to the address on an account (identical answer whether or not it exists) |
| POST | `/api/auth/reset` | Spend that link and set a new password; ends every session for the account |
| POST | `/api/verify/certificate` | Multipart `file` → verification transcript (verdict, 12 checks, fields, SHA-256). Changes nothing |
| POST | `/api/claim` | Multipart `accessCode` + `file`: re-verifies server-side, then files the claim into the 72-hour check |
| GET | `/api/keyholder` | Keyholder-scoped view (no balances, assets, recipients or shares) |
| POST | `/api/claim/cancel` | Owner stops the handover |
| POST | `/api/beneficiary` | Toggle a beneficiary's reachability (owner side) |
| POST/PATCH/DELETE | `/api/assets` | Add, edit or remove an asset |
| POST | `/api/beneficiaries` | Add a person |
| PATCH | `/api/beneficiaries` | Rebalance backup shares (`shares`), edit a person (`update`), or remove a backup (`remove`) |
| POST | `/api/documents` | Add a guidance record (PDF only, ≤10 MB) |
| POST | `/api/profile` | Update contact details |
| POST | `/api/plan` | Seal the plan (refuses while checklist items are open) |
| GET | `/api/paypal/status` | Connection state, payout-account balance, release ledger (never a token) |
| GET | `/api/paypal/oauth/start` | Begin "Log in with PayPal" — sets an opaque `vivo_paypal_sid` cookie |
| GET | `/api/paypal/oauth/callback` | Verify signed state, exchange the code, store the connection |
| POST | `/api/paypal/disconnect` | Forget this browser's PayPal connection |
| POST | `/api/paypal/fund` | Open a PayPal order to add money to the release account |
| GET | `/api/paypal/fund/return` | Capture that order (id comes from an httpOnly cookie) and return to Settings |
| POST | `/api/paypal/payout` | Release the estate via PayPal. `{confirm:true}`, same-origin, window must be closed |

---

## The AI reader

A will is a form most people never fill in. `/plan/describe` takes a paragraph of ordinary speech —
*"my flat is worth about $120k, my daughter Chidi should get it, my son Tunde the savings"* — and
returns a draft plan: people, relationships, shares that total exactly 100%, and assets with amounts.

- `lib/ai.ts` speaks to an OpenAI-, Anthropic- or Gemini-shaped endpoint, chosen by which key is set
  (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`; `OPENAI_BASE_URL` points it at any compatible
  gateway). Keys are server-side only.
- The model's JSON is **validated and normalised** before it can touch anything: shares are rescaled to
  100, asset kinds are constrained to the three the app knows, amounts become cents, and anything without
  a name or a label is dropped.
- The model proposes; `lib/model.ts` still disposes. Applying a draft runs through the same
  `addBeneficiary` / `addAsset` checks as typing by hand — one first choice, no invented emails.
- With no key configured, a deterministic reader answers instead and the screen says **"rules, not a
  model"** rather than implying an intelligence that is not there.

## PayPal (sandbox)

The one place PayHalo leaves the building. Three capabilities, three trust levels:

| Capability | How | What it proves |
|---|---|---|
| Connect an account | "Log in with PayPal" (`openid profile email`) | Which PayPal account belongs to this browser |
| Add money | `POST /v2/checkout/orders` → payer approves at PayPal → `…/capture` | A real payment into the app's own business account, which is what a release spends |
| Read the payout balance | `GET /v1/reporting/balances` on the app's own business account | The pot that would fund a release — needs the app's `reporting/balances` scope |
| Release the estate | `POST /v1/payments/payouts` | Real (sandbox) transfers to each beneficiary's email |

Set up, once:

1. Create a REST app at [developer.paypal.com](https://developer.paypal.com/dashboard/applications) in
   **Sandbox** mode. Copy the Client ID and Secret.
2. Add `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` to the deployment (Vercel → Settings
   → Environment Variables), plus `PAYPAL_REDIRECT_URI=https://<your-domain>/api/paypal/callback`.
3. Register that same URL as the app's **Return URL** and enable *Log in with PayPal* on the app.
4. Enable `PAYPAL_PAYOUTS_ENABLED=true` **and** set `PAYPAL_PAYOUT_PASSCODE` to a phrase you are willing to
   rotate. Both are required: with either missing the release button never renders and the endpoint fails
   closed with the reason.

The release is behind a passcode on purpose: a signed-in owner plus a closed window is still not enough to
move money. The passcode is compared in constant time, wrong answers are limited to five per IP per ten
minutes, and the value is only ever read on the server. Order of checks in `/api/paypal/payout`: session →
configured → enabled → same-origin → `confirm:true` → passcode set (503) → lockout (429) → passcode (403) →
window closed (409) → dedupe → ≤15 recipients → batch.

How the release behaves:

- Before the 14-day window closes, `getReleaseLedger()` returns `null`, so `/api/paypal/payout` answers `409`.
  The payout path cannot be reached early, even by calling the API directly.
- Each recipient is paid exactly once per claim: rows already recorded for that claim are skipped, and
  PayPal's `sender_batch_id` is derived from the claim id, so a retry is rejected rather than paid twice.
- The Settings card shows the ledger, the batch id and per-recipient state. Tokens live server-side only and
  are never serialised into a page; `/api/paypal/status` returns identity, never credentials.
- The footer sentence changes when PayPal is configured, so the app never claims "no live connections"
  while holding a live one.

Sandbox test accounts: create a **Business** account (payer) and **Personal** accounts (beneficiaries) under
*Sandbox → Accounts*, and use their emails on the plan.

## Start a plan, the vault, and the release desk

A plan without a vault is a wish. **Start a plan** (`/plan/start`) is one write and three steps: name the
first person, open the vault, mint a key and send it to them.

- **The vault** (`lib/model.ts`) holds the plan's money: `stashCents + pot allocations + the asset total`.
  It has three states — `open`, `frozen`, `released` — and only one writer of `released`:
  `decideRelease(..., "approved")`. There is no amount and no destination anywhere in that signature, so an
  operator cannot pay a different person or a different sum.
- **The key** (`lib/vault-key.ts`) is minted once, emailed to the first beneficiary, and stored only as a
  SHA-256. Holding it is required to ask for the vault to be opened; nobody can read it back, including us.
- **The release desk** (`/admin`) is behind `ADMIN_PASSCODE`. Operators read the documentation, hold a request
  for research, then approve or decline. **Approve release** is the only path into a vault, and the money goes
  to the plan's own named beneficiaries.
- **Benefactors can see the other direction.** `/beneficiaries` carries a *Plans that name you* section, and
  `/beneficiary` shows the same thing for a signed-in account: whose plan names you, your share, the vault
  state, and the one button you have — *Request the assets*, with your key. A signed-in person only ever sees
  plans where their own email is written, via `driver.scan()` filtered to that address.

Env for this flow: `ADMIN_PASSCODE` (the release desk), plus `BREVO_API_KEY` and `MAIL_FROM` for the key
email. Without the mail pair the wizard shows the key to the owner exactly once so it can be handed over by
hand — it is never stored in clear.

## Forgot password

**Forgot your password?** (`/forgot-password`, linked from the sign-in form) is the one way back in when the
password is gone. It reuses the signed-link machinery rather than inventing a second identity system:

- **Request** (`POST /api/auth/forgot`) takes an email and answers the same whether or not the address has an
  account, so it cannot be used to find out who is a customer. When the address is known and email delivery is
  configured, it mints a `set-password` token and emails a link to `/reset-password?token=…`.
- **The link** (`/reset-password`) is one-use and good for thirty minutes. It lets that person choose a new
  password — it does **not** open the plan, and the password still has to pass the same rules as sign-up. A
  rejected password does not burn the link: the token is redeemed only once the new one is accepted.
- **After** the password changes, every existing session for the account ends (`dropSessionsForUser`), so an old
  login cannot survive a reset, and a quiet note goes to the address on file — so the account holder learns the
  same minute if it was not them.
- With email delivery off, no reset link can be sent and the screen says so; there is no fallback that reveals a
  reset token. Passwords, and the sign-in code they trigger, still work without it.

Env for this flow: `BREVO_API_KEY` + `MAIL_FROM` (the same pair as the sign-in link). No new configuration is
needed beyond email delivery.

## Storage

| Order | Condition | Driver | Durable |
|---|---|---|---|
| 1 | `HACK1_STORE=supabase` \| `kv` \| `sqlite` \| `memory` | forced driver | — |
| 2 | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` present | Supabase Postgres | ✅ |
| 3 | `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` present | Vercel KV / Upstash | ✅ |
| 4 | local machine with a writable disk | SQLite file | ✅ |
| 5 | anything else (e.g. Vercel with no database) | in-memory, seeded | ❌ |

Remote drivers are wrapped in a guard: if one errors, the app logs it and keeps serving from memory
instead of returning a 500. Each owner's plan is one JSON document under its own key — a Supabase row
(`user_id`), a KV key (`vivo:doc:<id>`), a SQLite row, or a `Map` entry in memory.

## Honest limits

- The verifier reads the real file, but it is still a heuristic: it can be fooled by a well-made
  forgery, and it is not connected to any civil registry. That is exactly why a passed document still
  sits in a 72-hour review before the owner is told. It is document processing, not legal proof of death.
- Uploaded files are checked in memory and never stored — the claim keeps the SHA-256, the extracted
  fields and the transcript, not the document itself. Document rows in the UI are records, not files.
- PayPal is the one live integration, in sandbox until the round-trip is verified. Wallets and
  storefronts remain records you describe.
- Payouts move money from the app's **own** PayPal business account — PayPal authorises payouts from an
  account you control, not from a beneficiary's. PayPal is not a bank and PayHalo does not hold customer
  balances. Live payouts need `PAYPAL_ENV=live` **and** `PAYPAL_ALLOW_LIVE_PAYOUTS=true`, and the release
  still requires the passcode.
- Accounts are real and self-hosted. Email goes through **Brevo** (`BREVO_API_KEY`, `MAIL_FROM`,
  `MAIL_FROM_NAME`); it carries the sign-in link, the password-reset link and the vault key. Until those are set
  the link tab says delivery is off, and the wizard shows the key to the owner exactly once to hand over. The
  forgot-password flow sends its reset link through the same channel — with delivery off it cannot be sent, and
  the screen says so rather than pretending otherwise.
- A signed share link is a bearer credential. Anyone holding it sees that audience's view until the
  secret is rotated — which invalidates every link at once. There is no per-link revocation yet.
- Terms, privacy, data-export and account-deletion pages are **not built** (deliberately deferred).
- Platform terms and inheritance law still apply. PayHalo makes the process preparable, not bypassable.
