# Hack1 — a plan for your digital life

A working prototype of the **Dormant Billion** idea from *Dawnik Lab Team 1 (PRD)*: a simple,
automated inheritance system for people whose wealth lives in PayPal balances, crypto wallets and
online businesses.

> If something happened to you today, would your family know where your money lives — or how to
> get it?

Hack1 gives someone a way to decide *who gets what, in what order* before it's too late, name a
keyholder who can start the handover, and give the family a plan instead of a puzzle.

**All accounts, balances, documents and transfers are simulated.** Nothing here creates a legal
instrument or moves real money.

---

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
```

Requires **Node 22+** (the prototype stores data with the built-in `node:sqlite` module — no native
compilation, no external database).

Production: `npm run build && npm start`.

The database is created and seeded automatically at `data/hack1.db` on first request.

---

## The four screens

| Route | Role | What it does |
|---|---|---|
| `/` | — | The story, the mechanics, and a live view of the seeded estate |
| `/onboarding` | Owner | 8-step story-first setup: identity → accounts → primary → backups + split → cause → keyholder → seal |
| `/dashboard` | Owner | Estate breakdown, the handover list, live split preview, keyholder code, safety-window alert, handover trail |
| `/keyholder` | Trusted keyholder | Access code → certificate upload → simulated OCR + checks → verification → 14-day window → release |
| `/beneficiary` | Beneficiary | Read-only: allocation, assets released, the note left for them, and the audit trail |

A floating **Demo** dock (bottom-right) resets the household to its seeded state at any time.

---

## Demo script (90 seconds)

1. **`/`** — the hook, and the seeded estate: $26,330.70 across three accounts, four recipients.
2. **`/dashboard`** — the handover list. Toggle Chidi (primary) to **unreachable** and watch the
   split fall through to the backups at 60/40 instantly. Toggle them all off → everything routes to
   the charity. Toggle back.
3. **`/keyholder`** — click *Use demo code*, *Use the sample certificate*, submit. Watch the
   simulated extraction (fields + confidence + verification checks). Approve verification.
4. Back on **`/dashboard`** — the owner now sees **"Someone started your handover"** with a live
   14-day countdown and a cancel button. (This is the safety window doing its job.)
5. Return to **`/keyholder`** → *Fast-forward to day 14* → the automation engine releases the
   estate.
6. **`/beneficiary`** — pick a recipient: their allocation, the assets it came from, and the note
   the owner wrote.
7. Reset from the **Demo** dock and run it again with a different reachability combination.

---

## How it works

```
Next.js App Router (server components read the DB directly)
        │
        ├── lib/store.ts     reads + mutations, the only place SQL is written
        ├── lib/engine.ts    the allocation rules
        ├── lib/ocr.ts       simulated document extraction
        └── lib/db.ts        node:sqlite connection, schema, seed, reset
```

**Engine rule** (`lib/engine.ts`), executed when a verified claim's safety window ends:

1. Primary beneficiary reachable → receives 100%.
2. Otherwise the reachable backups split the estate by their weights.
3. Otherwise the designated charity receives everything.

Allocation is integer-cent arithmetic with the remainder going to the last recipient, and every
step appends to an immutable `event` trail (the "handover trail" in the UI).

**Safety window.** A claim starts as `verifying`, becomes `window` with `window_ends_at = now + 14
days`, and only releases once that timestamp has passed. The window can be cancelled by the owner at
any point (claim → `cancelled`, plan → `active`, nothing transferred). The *fast-forward* button
exists purely so the demo can skip the fortnight; a live system would never expose it.

**Persistence.** SQLite tables: `user`, `plan`, `asset`, `beneficiary`, `keyholder`, `claim`,
`distribution`, `event`. Schema + seed live in `lib/db.ts` / `lib/seed.ts`; `POST /api/demo/reset`
wipes and re-seeds.

### API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/state` | Full snapshot (auto-settles any expired window) |
| POST | `/api/onboarding` | Create/replace a sealed plan |
| POST | `/api/claim` | Keyholder submits a certificate (validates access code) |
| POST | `/api/claim/verify` | Clears verification, opens the 14-day window |
| POST | `/api/claim/cancel` | Owner stops the handover |
| POST | `/api/claim/fast-forward` | Demo: jump to the end of the window |
| POST | `/api/beneficiary` | Toggle a beneficiary's reachability |
| POST | `/api/demo/reset` | Restore the seeded household |

---

## Design notes

- Warm-dark "quiet luxury": ink background, brass accents, Instrument Serif display type, Inter for
  UI — inheritance software that feels like a keepsake rather than a bank form.
- Story-first onboarding (the PRD calls this vital): the first screen explains *why* before asking
  for anything.
- Beneficiary previews are deliberately hidden until a handover completes, so nobody can pressure
  the owner while they're alive.

## Honest limits

- The OCR is simulated and deterministic — it demonstrates document processing, not legal proof of
  death. A production build needs registrar verification and human review.
- No real platform integration: PayPal, wallets and storefronts would require their own
  cooperation, security controls and compliance work.
- Platform terms and inheritance law still apply. Hack1 makes the process preparable, not
  bypassable.
