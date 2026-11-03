import type { DatabaseSync } from "node:sqlite";

/**
 * Seeds the curated demo household (Ada Okafor) so the prototype is
 * immediately explorable — no empty state for judges to wade through.
 */
export function seedDemo(db: DatabaseSync) {
  const now = new Date();
  const stamp = now.toISOString();

  const userId = Number(
    db
      .prepare("INSERT INTO user (name, email) VALUES (?, ?)")
      .run("Ada Okafor", "ada@hack1.demo").lastInsertRowid,
  );

  const planId = Number(
    db
      .prepare("INSERT INTO plan (user_id, status, sealed_at, updated_at) VALUES (?, 'active', ?, ?)")
      .run(userId, stamp, stamp).lastInsertRowid,
  );

  const asset = db.prepare(
    "INSERT INTO asset (user_id, kind, label, provider, balance_cents, detail, connected) VALUES (?, ?, ?, ?, ?, ?, 1)",
  );
  asset.run(userId, "paypal", "PayPal Business", "PayPal", 842050, "2 currencies · 41 pending payouts");
  asset.run(userId, "crypto", "Self-custody wallet", "Ethereum + Bitcoin", 561020, "0.0842 BTC · 3.10 ETH");
  asset.run(userId, "business", "Ada's Studio (storefront)", "Gumroad + Stripe", 1230000, "$4,100 MRR · 612 customers");

  const ben = db.prepare(
    "INSERT INTO beneficiary (user_id, name, email, relationship, role, share, sort, available, note) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
  );

  ben.run(
    userId,
    "Chidi Okafor",
    "chidi@hack1.demo",
    "Brother",
    "primary",
    100,
    0,
    "You covered me when I had nothing. Use this to finish the house in Enugu — and please take the studio to Lagos. Don't be scared to spend some of it on yourself.",
  );
  ben.run(
    userId,
    "Ngozi Okafor",
    "ngozi@hack1.demo",
    "Mother",
    "backup",
    60,
    1,
    "Mama, this is for you first. The rest goes to the education fund we talked about.",
  );
  ben.run(
    userId,
    "Tunde Bello",
    "tunde@hack1.demo",
    "Cousin",
    "backup",
    40,
    2,
    "You always said I should teach you crypto. Last lesson: hold it, and don't panic-sell when the market gets loud.",
  );
  ben.run(
    userId,
    "The Girls' Code Fund",
    "hello@girlscode.fund",
    "Registered nonprofit",
    "charity",
    100,
    3,
    "If there's no one left to carry this, let it go to the people who taught me to build. Fund the next girl who has nothing but a laptop.",
  );

  db.prepare(
    "INSERT INTO keyholder (user_id, name, email, relationship, access_code) VALUES (?, ?, ?, ?, ?)",
  ).run(userId, "Emeka Nwosu", "emeka@hack1.demo", "Best friend", "KEY-4721");

  db.prepare(
    "INSERT INTO event (plan_id, type, title, body, created_at) VALUES (?, 'plan.sealed', ?, ?, ?)",
  ).run(
    planId,
    "Plan sealed",
    "Ada sealed a plan covering 3 connected accounts and 4 recipients.",
    new Date(now.getTime() - 1000 * 60 * 60 * 24 * 46).toISOString(),
  );
}
