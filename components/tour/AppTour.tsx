"use client";

import { Tour, type TourStep } from "@/components/tour/Tour";

/**
 * The tour inside the product. Same engine as the site, different subject: the
 * five places an owner actually works from. It opens by itself for a first-time
 * account, and can be replayed from the header, Help, or Account settings.
 */
const OWNER_STEPS: TourStep[] = [
  {
    kicker: "Your plan",
    title: "Welcome to PayHalo.",
    body: "Five screens do everything: your overview, the assets you record, the people who inherit, the instructions and the handover. This takes about a minute.",
  },
  {
    target: "nav-assets",
    kicker: "Step 1 of 4",
    title: "Record what you own.",
    body: "Payment accounts, wallets and online businesses. Enough identifying detail that someone else could find them — never a password or a private key.",
  },
  {
    target: "nav-people",
    kicker: "Step 2 of 4",
    title: "Decide who inherits.",
    body: "Primary beneficiaries first, then backups, then a final beneficiary. Shares always add up to 100%, so nothing is left to assumption.",
  },
  {
    target: "nav-plan",
    kicker: "Step 3 of 4",
    title: "Appoint a Trusted Key.",
    body: "The one person who can start a handover request. They submit proof of death, you are notified after verification, and you have 14 days to cancel.",
  },
  {
    target: "nav-plans",
    kicker: "Step 4 of 4",
    title: "One account, several arrangements.",
    body: "Keep a family plan and a business plan apart, or switch between plans you have made. Each has its own assets, people and Trusted Key.",
  },
  {
    target: "app-halo",
    kicker: "Support",
    title: "Halo is here the whole way.",
    body: "Ask about death documentation, keys, the safety window or where your money sits. Halo answers from your own plan, and says so plainly when something is not recorded.",
  },
];

export function AppTour({ auto = false }: { auto?: boolean }) {
  return <Tour steps={OWNER_STEPS} storage="payhalo.tour.app.v1" auto={auto} eventName="payhalo:tour:app" label="PayHalo product tour" />;
}

export function AppTourButton({ className = "btn btn-secondary btn-sm" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("payhalo:tour:app"))}>
      Take the tour
    </button>
  );
}
