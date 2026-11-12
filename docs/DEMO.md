# Judging guide

PayHalo is a plan for what happens to your money when you cannot answer for it. Two halves meet in it:
PayPal is where the money actually lives and moves, and a model reads a paragraph of ordinary speech
and turns it into the plan.

Everything below is real code in this repository. Nothing in the demo path is a mockup.

---

## 1. Run it

Node 22 (`engines` in `package.json`).

```bash
npm install
cp .env.example .env.local     # optional — see below
npm run dev                    # http://localhost:3000
```

With **no** `.env.local` at all the app still runs: the in-memory driver holds the plan for the life of
the process, PayPal is off, and the "describe your plan" reader uses the deterministic fallback. Sign up
with any email address — there is no verification step in the way. The forgot-password flow needs email
delivery (`BREVO_API_KEY` + `MAIL_FROM`) to send its reset link; with delivery off it says so instead.

### Environment, if you want the full path

```bash
# PayPal — sandbox by default. Client id + secret from
# https://developer.paypal.com/dashboard/applications (Sandbox tab).
PAYPAL_ENV=sandbox
PAYPAL_SANDBOX_CLIENT_ID=...
PAYPAL_SANDBOX_CLIENT_SECRET=...
PAYPAL_PAYOUTS_ENABLED=true          # turn Payouts on in the app's settings first
PAYPAL_PAYOUT_PASSCODE=any phrase    # required: payouts fail closed without it

# AI reader — any one of these. Without one, the rules-based reader answers.
OPENAI_API_KEY=...                   # or ANTHROPIC_API_KEY / GEMINI_API_KEY
AI_MODEL=gpt-4o-mini

# Email — Brevo transactional (sign-in link, password reset + vault key)
BREVO_API_KEY=...
MAIL_FROM=hello@yourdomain.com
MAIL_FROM_NAME=PayHalo

# Operator desk
ADMIN_PASSCODE=...
```

`PAYPAL_ENV=sandbox` uses `PAYPAL_SANDBOX_*` when present and the shared `PAYPAL_CLIENT_*` otherwise,
so one deployment can hold both pairs without swapping secrets.

### Hosted demo

<https://hack1-weld.vercel.app> — sign in with an email and password you choose at `/signup`. Each
account owns one plan; nothing is shared between accounts.

---

## 2. A five-minute pass through the product

1. **Sign up** → an empty plan, no sample data.
2. **Describe a plan** (`/plan/start` → *Describe your plan in a paragraph*, or `/plan/describe`).
   Paste: *"My flat is worth about $120,000 and my savings are roughly $18,000. My daughter Chidi
   should get the flat. My son Tunde gets the savings. My sister Ngozi is the backup."*
   The draft comes back with people, shares totalling 100%, and assets with amounts. Press **Add to my plan**.
3. **Start the vault** (`/plan/start`) → names the first beneficiary, opens the vault, mints a key. The
   key is emailed when `BREVO_API_KEY` + `MAIL_FROM` are set; otherwise it is shown **once** to hand over.
4. **My Plan** → *The vault* card: reference, key recipient, balance, release state.
5. **Dashboard** → Send / Receive under the asset card; the vault card below it.
6. **Beneficiaries** → *Plans that name you*: the other direction.
7. **Beneficiary home** (`/beneficiary`, signed in, with the key) → *Request the assets*.
8. **Release desk** (`/admin`, `ADMIN_PASSCODE`) → hold for research, or **Approve release** with a note.
   Approval flips the vault to `released` and shows on the owner's own screens.

**Sign-in and password reset.** Sign-in takes a password *and* a six-digit code by email, or a one-time
emailed link. If the password is forgotten, **Forgot your password?** (on the sign-in form) emails a
one-time, thirty-minute link to the address on the account; opening it lets that person set a new password,
ends every other session, and sends a note so the account holder knows it happened. Both the sign-in link
and the reset link need email delivery configured.

---

## 3. Three-minute video script

| Time | Screen | Say / do |
|---|---|---|
| 0:00–0:20 | Landing | The problem: money scattered across PayPal, wallets and a storefront, and a family that cannot reach any of it. |
| 0:20–0:50 | `/plan/describe` | Paste the paragraph. Press **Read it back to me**. Point at the shares normalising to 100% and the amounts becoming assets. *"A model read that. The app still validates every line."* |
| 0:50–1:20 | `/plan/start` | Name the first person → **Open the vault and send the key**. Show the vault reference and the key. |
| 1:20–1:50 | Dashboard → Send/Receive | Show Receive issuing an invoice through the PayPal Invoicing API; show Send on the sandbox Payouts path (or the lock, and why). |
| 1:50–2:20 | `/beneficiary` (second browser profile) | The plan that names you, your share, **Request the assets** with the key. Wrong key first — it is refused. |
| 2:20–2:45 | `/admin` | The request arrives. Hold for research, then **Approve release**. |
| 2:45–3:00 | Owner's `/plan` | The same moment on the owner's screen: vault `released`, request `approved`, amount, note. *"No operator could have named a different person or a different amount."* |

---

## 4. What is real, and what is not

- **PayPal** — the calls in `lib/paypal.ts` are the real REST APIs: OAuth token, balances, invoicing, and
  Payouts. `/api/paypal/diagnose` reports what the stored credentials can actually do.
- **AI** — `lib/ai.ts` calls OpenAI-, Anthropic- or Gemini-shaped endpoints server-side and validates the
  JSON it gets back. With no key it falls back to a deterministic reader, labelled *"rules, not a model"*
  on screen. The model never writes to the plan; it produces a draft you approve.
- **Document verification** — the claim verifier reads the uploaded PDF and extracts fields, but it is a
  heuristic, not a civil-registry lookup. That is why a passed document still waits 72 hours and then
  gives the owner 14 days to answer.
- **Money movement on release** — an approved release flips the vault to `released` and pays the plan's
  named beneficiaries through Payouts. Approval carries no amount and no destination, so it cannot be
  redirected. Where Payouts is not enabled for an account, the release is recorded and the screens say
  the transfer is waiting on PayPal rather than pretending it happened.
- **Not built, deliberately** — terms, privacy, export and account deletion; per-link revocation.
