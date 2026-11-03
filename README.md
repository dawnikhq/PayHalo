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

State is created and seeded automatically on the first request. There is nothing to configure:
locally it persists to `data/hack1.db`; on Vercel it runs in memory (or against Vercel KV if you
attach one — see [Deploy to Vercel](#deploy-to-vercel)).

---

## Deploy to Vercel

The app is ready to deploy as-is — no database to provision, no environment variables required.

**1. Import the repo**

- Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → `dawnikhq/HACK1`.
- Framework preset: **Next.js** (auto-detected). Root directory: `./`. Build command and output
  directory: leave the defaults.
- This work lives on the branch `arena/ecc53be6-hack1`. In the import screen open **"Deploying a
  Git branch"** and pick it — or merge the branch into `main` first and deploy from there.
- Click **Deploy**. Expect ~1 minute.

**2. Optional — make demo state durable**

Without this, the deployment runs in ephemeral mode: data is seeded per serverless instance and can
reset between requests (the demo dock shows a red dot and *"resets per instance"*). For a
stable demo — the one you'll want in front of judges — attach a Redis store:

- Project → **Storage** → **Marketplace** → **Upstash Redis** → *Create* (free tier is plenty) →
  **Connect** to the project.
- Vercel injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` pair) into
  all environments automatically. **Redeploy** once so the functions pick them up.
- The demo dock should now show a green dot and *"Vercel KV / Upstash Redis"*.

The app stores one JSON document under the key `hack1:state`, so nothing else is needed.

**3. Deploy from the CLI (alternative)**

```bash
npm i -g vercel
vercel link                     # link this folder to a Vercel project
vercel deploy                   # preview URL
vercel deploy --prod            # production
```

**Storage resolution order** (`lib/storage/index.ts`):

| Order | Condition | Driver | Durable |
|---|---|---|---|
| 1 | `HACK1_STORE=kv` \| `sqlite` \| `memory` | forced driver | — |
| 2 | `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` present | Vercel KV / Upstash | ✅ |
| 3 | local machine with a writable disk | SQLite file | ✅ |
| 4 | anything else (e.g. Vercel without KV) | in-memory, seeded | ❌ |

### Why it needed changes for Vercel

Vercel's filesystem is read-only and ephemeral, so the original `node:sqlite` file store would have
thrown `EROFS` on the first write. Persistence is now behind a driver interface with the same
single-document model everywhere, which also made the engine and reset logic simpler.

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
Next.js App Router (async server components read state directly)
        │
        ├── lib/store.ts        async facade: load → settle → save
        ├── lib/model.ts        the state document, seed, and every mutation
        ├── lib/engine.ts       the allocation rules (pure)
        ├── lib/ocr.ts          simulated document extraction
        └── lib/storage/        drivers: kv.ts · sqlite.ts · memory.ts
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

**Persistence.** The whole household is one JSON document (`user`, `plan`, `assets`,
`beneficiaries`, `keyholder`, `claims`, `distributions`, `events`). Reads settle any expired window
and write back; mutations are read-modify-write. `POST /api/demo/reset` restores the seed.

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
| GET | `/api/meta` | Which storage driver is live (shown in the demo dock) |

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
