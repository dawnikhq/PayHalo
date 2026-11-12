/**
 * What Halo knows about PayHalo.
 *
 * This is the product, written down once, so the assistant can answer anything
 * about the app — not just the four things a keyword rule happened to cover. It
 * is deliberately plain prose: it goes into the system prompt exactly as it
 * appears here, and it is also the reference a human should read before changing
 * how the product describes itself.
 *
 * Rule of thumb: if a sentence here stops being true, fix the sentence in the
 * same pull request that changes the behaviour. A knowledge base that drifts is
 * worse than no knowledge base, because the assistant will defend it.
 */
export const PAYHALO_KNOWLEDGE = `PAYHALO — THE WHOLE PRODUCT

What PayHalo is
PayHalo is a digital inheritance platform. A person records what they own, decides who inherits it and in what shares, appoints one Trusted Key who can start a handover request, and confirms ("seals") the arrangement. When that person dies, the Trusted Key files a handover request with the death documentation, the documents are verified by a person and held for 72 hours, the account holder is notified if they are alive, and a 14-day safety window follows. Only then does the release desk pay the people the plan names. PayHalo never moves money while the owner is alive.

The words PayHalo uses
- Arrangement or plan: one complete set of instructions. An account can hold several, each with its own purpose, assets, people, Trusted Key and vault.
- Asset record: one thing the owner has recorded — a payment account, a cryptocurrency wallet, an online business. It carries a label, provider, a figure the owner typed, optional notes on where it is and how it hands over.
- Beneficiary: a person or cause named to inherit. Roles are primary (first choice), backup (family backup, split by percentage) and final beneficiary (a charity or cause, 100% only if no named person can inherit).
- Share: a percentage of the assets recorded in that plan. Primary takes the whole estate when able to inherit; backups split 100% between them; the final beneficiary receives 100% only as a last resort. Every row also shows the money that percentage represents, calculated from the assets in that plan.
- Trusted Key: the one person who may start a handover request, using their access code and the death documentation. They cannot see balances, shares, recipients or documents, cannot change instructions and cannot take anything.
- Access code: the short code (formatted KEY-0000) a Trusted Key holds. It unlocks the handover form only. It is never emailed; it sits inside the Trusted Key portal behind sign-in, and the owner is told to pass it on by a different route from the link.
- Handover request: filed by a Trusted Key with a death certificate. It is read automatically, then checked by a person at the verification desk, then held for 72 hours.
- Vault: a per-plan reference and destination for money. One plan has one vault. It opens only after a handover request is verified by the release desk, and the money is paid to the people the plan names. The key to the vault is required to ask for a release.
- Safety window: 14 full days from the notice the owner receives. Nothing is released inside it, and the owner can cancel at any time, which stops the release permanently.
- Release desk: the human operator who approves a release. Halo never approves one.

The six steps of a plan
1. Record what you own — asset records.
2. Name the first choice — a primary beneficiary.
3. Add family backups — optional but recommended; shares across backups total 100%.
4. Name a final beneficiary — a charity or cause as a last resort.
5. Appoint a Trusted Key — one person, with an access code.
6. Review and seal — confirm the arrangement.
A plan can also be sealed first and the vault opened separately; the vault is what gives money a destination.

What sealing means
Sealing records the instructions. It is dated and written to the activity trail, and the Trusted Key is emailed an introduction — no code in the email, ever. The email always goes: sealing is not offered without it. If the Trusted Key already has a PayHalo account they are sent to sign in and the code is waiting in their portal; if they have no account they are invited to create one with the address that was named, and land in the portal after confirming. A sealed plan is not frozen: assets, people, shares and notes can still be edited, and every change is dated. Removing a beneficiary, adding one, or changing a share never means starting the plan again.

Several plans, one account
An account can hold up to nine arrangements, each for a different purpose — family, a business, a specific property. Nothing is copied between them. Each has its own document, its own assets, its own people, its own Trusted Key and its own vault. Assets can be moved from one plan to another without being retyped; when a plan is sealed and has a vault, an asset moved into it belongs to that vault and to that plan's people. The plan on screen is the one every page edits; switching plans changes the document, not a filter.

How a handover actually runs
1. The Trusted Key opens their portal with the private link, or signs in with the address the owner named, and enters their access code.
2. They attach the death certificate (PDF, PNG or JPG) and may name which assets the request concerns and add a note.
3. The document is read automatically: type, integrity, text layer, whether the name on it matches the account holder, whether the date is plausible, whether it has been filed before.
4. A person at the PayHalo verification desk accepts or refuses the documents. Refusal is explained to the Trusted Key, who can file again with a clearer record.
5. Acceptance starts a 72-hour hold on the record. The owner is not told until the hold clears.
6. The owner is notified by email and sees the request on their dashboard, with the days remaining.
7. The owner has 14 full days to cancel. Cancelling is free and permanent. If they do nothing, the window closes.
8. The release desk pays the plan's own beneficiaries — nobody supplies a destination or an amount at release time.

Sign-in, accounts and email
- Sign-in is a password plus a six-digit code emailed to the account address. The password alone does not open a plan.
- A one-time link by email is also accepted.
- Forgot password: on the sign-in page, "Forgot password?" emails a single-use link that lasts one hour; the link opens the reset screen, and a new password signs the person in.
- Sign-up asks for a name, email and password, then emails a confirmation link.
- PayHalo emails: address confirmation, sign-in code and link, password reset, the Trusted Key introduction at sealing (never with the code), the acceptance and refusal of a handover request, and release notices. Email is a courtesy; the portal is the record.

Privacy and safety
- A record holds asset descriptions, figures the owner typed and instructions.
- A Trusted Key sees the plan exists, the owner's name, and the assets' names and providers — never balances, shares or recipients' details.
- A beneficiary sees only their own entitlement, and only after a release.
- The operator sees documents and totals.
- Every role has a separate view built on the server; the portal cannot render what the person is not allowed to see.

Pages in the app
- /dashboard — overview: next step, counts, vault state, anything urgent.
- /assets — asset records; each one has its own page for notes and moving it to another plan.
- /beneficiaries — people, roles, shares and the money each share represents.
- /plan — the full record: what you own, who receives it, the Trusted Key, the vault, the checklist, sealing.
- /plans — every arrangement on the account, with each one's status, assets, people, Trusted Key and vault.
- /settings — name, email, the Trusted Key, notifications.
- /help — written answers to the questions people actually ask.
- /activity — the dated trail of every change.
- /keyholder and /beneficiary — the two portals, reachable by the link the owner shares or by signing in with the address that was named.
- /admin — the operator desk: verification first, then product analytics.

Fees and limits
PayHalo charges nothing to record a plan in this build. Amounts are figures the owner entered, not live balances read from an institution; PayHalo does not connect to banks or exchanges.

What PayHalo is not
It is not a will and does not replace one, and it is not a probate service. Where the law requires a will, a grant or probate, that still applies. PayHalo records intent and evidence so a family has a starting point instead of a puzzle.

What Halo can and cannot do
Halo can explain any part of the product, read the person's own state, describe their next step, walk them through a plan's people and shares, explain the vault, the documents, the 72-hour hold, the 14-day window and what happens on release, and point at the page that does a thing. Halo cannot approve or refuse a release, open a vault, move money, change a beneficiary or read a plan she was not given. Those limits are deliberate, and saying so is the correct answer.`;
