# VIVO — Your legacy, considered.

A working prototype of the **Dormant Billion** idea from *Dawnik Lab Team 1 (PRD)*: a calm, verified
handover for a digital life lived across PayPal balances, crypto wallets and online businesses.

> If something happened to you today, would your family know where your money lives — or how to
> get it?

VIVO lets someone decide *who gets what, in what order* while they are well, name a trusted keyholder
who can start a claim, and give their family a plan instead of a puzzle. Nothing is released before a
document has been verified **and** the account holder has had **14 full days** to respond.

**Live demo: <https://hack1-weld.vercel.app>** (no login, seeded with a demo household)

Share cards live in `docs/demo/` and are regenerated with `node scripts/make-demo-image.mjs`.

**All accounts, balances, documents and transfers are simulated.** Nothing here creates a legal
instrument or moves real money.

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

VIVO is one art-directed product, not a set of screens. Every page is built from the same token layer
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
  workspace", "Private by design", a lime *Simulated workspace* pill, Help), and a real mobile
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
| `/documents` | Owner | Guidance records with search, access level, and a simulated upload |
| `/activity` | Owner | Grouped trail with category filters; a claim in its registry check never appears |
| `/settings` | Owner | Profile form, role-visibility table, keyholder access code, what VIVO never asks for |
| `/help` | Owner | FAQ, simulated support request, the safety notice in four steps |
| `/keyholder` | Keyholder | Role home → claim intake (code, evidence, confirmation) → review → window → complete |
| `/keyholder/support` | Keyholder | Same help content, keyholder frame |
| `/beneficiary` | Beneficiary | Quiet → safety window (days remaining) → released entitlement and instructions |
| `/beneficiary/support` | Beneficiary | Same help content, beneficiary frame |
| `/plan/sheet` | Owner | The printable instruction sheet the whole product exists to produce |

A floating **Demo** dock (bottom-right) resets the household, jumps to either portal, or starts a
fresh plan.

---

## Roles, enforced by architecture

Route groups give each portal its own layout, and each layout receives a **different, already-scoped
read** — the portals are not the same data hidden with CSS.

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
- VIVO never asks for a password, private key or recovery phrase, and no portal can display one.

---

## Demo script (90 seconds)

1. **`/dashboard`** — $26,330.70 across three accounts, four recipients, five of five steps complete.
   The distribution bar and the beneficiary summary are derived from live state.
2. **`/assets`** — search "wallet", filter to crypto, open the wallet. Only type-appropriate metrics
   appear. Edit the handover instructions; the asset flips from *Review instructions* to *Included*.
3. **`/keyholder`** — *Start a simulated claim*, *Use demo code*, then *Use the sample certificate*.
   The document is read for real: structure, text layer, the deceased's name, the certificate number
   and the registrar. All twelve checks pass. Now try *a document that isn't one* (a Gumroad payout
   receipt) — it is refused, with reasons.
4. File it. The claim enters a **72-hour registry check**: the keyholder sees the countdown, and
   **the owner sees nothing at all** — no pill, no banner, no trail entry.
5. *Fast-forward the 72 hours*. The owner is notified: `/dashboard` shows the forest safety-window
   card with the 14-segment clock and a stop control. Nothing else changed.
6. `/beneficiary` during the window shows days remaining and **no amounts at all**.
7. *Fast-forward to day 14* → release. `/beneficiary` now shows that person's own entitlement only;
   `/keyholder` still shows no balances, and says so.
8. Reset from the **Demo** dock and try stopping the handover instead.

---

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
| POST | `/api/verify/certificate` | Multipart `file` → verification transcript (verdict, 12 checks, fields, SHA-256). Changes nothing |
| POST | `/api/claim` | Multipart `accessCode` + `file`: re-verifies server-side, then files the claim into the 72-hour check |
| GET | `/api/keyholder` | Keyholder-scoped view (no balances, assets, recipients or shares) |
| POST | `/api/claim/cancel` | Owner stops the handover |
| POST | `/api/claim/fast-forward` | Demo: move one clock (72-hour check, then the 14-day window) |
| POST | `/api/beneficiary` | Toggle a beneficiary's reachability (owner side) |
| POST/PATCH/DELETE | `/api/assets` | Add, edit or remove an asset |
| POST | `/api/beneficiaries` | Add a person |
| PATCH | `/api/beneficiaries` | Rebalance backup shares (`shares`), edit a person (`update`), or remove a backup (`remove`) |
| POST | `/api/documents` | Add a guidance record (PDF only, ≤10 MB) |
| POST | `/api/profile` | Update contact details |
| POST | `/api/plan` | Seal the plan (refuses while checklist items are open) |
| POST | `/api/demo/reset` | Restore the seeded household |
| GET | `/api/meta` | Which storage driver is live + a health probe |
| GET | `/api/paypal/status` | Connection state, payout-account balance, release ledger (never a token) |
| GET | `/api/paypal/oauth/start` | Begin "Log in with PayPal" — sets an opaque `vivo_paypal_sid` cookie |
| GET | `/api/paypal/oauth/callback` | Verify signed state, exchange the code, store the connection |
| POST | `/api/paypal/disconnect` | Forget this browser's PayPal connection |
| POST | `/api/paypal/payout` | Release the estate via PayPal. `{confirm:true}`, same-origin, window must be closed |

---

## PayPal (sandbox)

The one place VIVO leaves the building. Three capabilities, three trust levels:

| Capability | How | What it proves |
|---|---|---|
| Connect an account | "Log in with PayPal" (`openid profile email`) | Which PayPal account belongs to this browser |
| Read the payout balance | `GET /v1/reporting/balances` on the app's own business account | The pot that would fund a release — needs the app's `reporting/balances` scope |
| Release the estate | `POST /v1/payments/payouts` | Real (sandbox) transfers to each beneficiary's email |

Set up, once:

1. Create a REST app at [developer.paypal.com](https://developer.paypal.com/dashboard/applications) in
   **Sandbox** mode. Copy the Client ID and Secret.
2. Add `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` to the deployment (Vercel → Settings
   → Environment Variables), plus `PAYPAL_REDIRECT_URI=https://<your-domain>/api/paypal/callback`.
3. Register that same URL as the app's **Return URL** and enable *Log in with PayPal* on the app.
4. Optional: enable `PAYPAL_PAYOUTS_ENABLED=true` to let the release button actually pay out. Without it the
   ledger still renders, and every attempt explains why it is blocked.

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

## Storage

| Order | Condition | Driver | Durable |
|---|---|---|---|
| 1 | `HACK1_STORE=supabase` \| `kv` \| `sqlite` \| `memory` | forced driver | — |
| 2 | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` present | Supabase Postgres | ✅ |
| 3 | `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` present | Vercel KV / Upstash | ✅ |
| 4 | local machine with a writable disk | SQLite file | ✅ |
| 5 | anything else (e.g. Vercel with no database) | in-memory, seeded | ❌ |

Remote drivers are wrapped in a guard: if one errors, the app logs it, keeps serving from memory and
reports itself as non-durable in the demo dock instead of returning a 500. The whole household is one
JSON document, so `POST /api/demo/reset` restores the seed.

## Honest limits

- The verifier reads the real file, but it is still a heuristic: it can be fooled by a well-made
  forgery, and it is not connected to any civil registry. That is exactly why a passed document still
  sits in a 72-hour review before the owner is told. It is document processing, not legal proof of death.
- Uploaded files are checked in memory and never stored — the claim keeps the SHA-256, the extracted
  fields and the transcript, not the document itself. Document rows in the UI are records, not files.
- PayPal is the one real integration, and only in sandbox. Wallets and storefronts remain records.
- Payouts move money from the app's **own** PayPal business account — PayPal authorises payouts from an
  account you control, not from a beneficiary's. Sandbox funds are fake; live payouts are locked behind
  `PAYPAL_ALLOW_LIVE_PAYOUTS=true` and should never be switched on while the demo has no login in front
  of the release button.
- There are no accounts or logins. Role separation is real in the data each portal is given, but the
  demo is a single shared household, so anyone with the link can press "Reset demo household".
- Platform terms and inheritance law still apply. VIVO makes the process preparable, not bypassable.
