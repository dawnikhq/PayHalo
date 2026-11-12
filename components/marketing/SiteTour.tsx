"use client";

import { Tour, type TourStep } from "@/components/tour/Tour";

/**
 * The tour a visitor gets on their first landing, and can ask for again from the
 * header. It reads the page it is standing on: the same seven ideas the page is
 * built from, each one pointing at the block that says it.
 */
const STEPS: TourStep[] = [
  {
    kicker: "Welcome",
    title: "A plan your family can actually follow.",
    body: "Six short steps: what PayHalo is, what you record, who inherits, how a handover is verified, and where to start. You can leave at any point.",
  },
  {
    target: "hero",
    kicker: "Step 1 of 6",
    title: "Start with one decision.",
    body: "Your wealth is spread across accounts, wallets and businesses. PayHalo gives you a place to say what exists, and what should happen to it.",
  },
  {
    target: "arrangements",
    kicker: "Step 2 of 6",
    title: "Six arrangements, all yours.",
    body: "Assets, beneficiaries, backups, a Trusted Key, the safety window and a final beneficiary. Every card here opens the part of the product that records it.",
  },
  {
    target: "how",
    kicker: "Step 3 of 6",
    title: "Four decisions to a finished plan.",
    body: "Record what you own, decide who inherits, appoint a Trusted Key, and let the handover process run when the time comes.",
  },
  {
    target: "safety",
    kicker: "Step 4 of 6",
    title: "Nothing moves on a single document.",
    body: "A handover request is checked, then you are told, then fourteen days pass. If the request was made in error, you cancel it.",
  },
  {
    target: "faq",
    kicker: "Step 5 of 6",
    title: "The awkward questions, answered.",
    body: "Does PayHalo hold your money? No. Does it need your passwords? No. Thirteen plain answers sit here, and Halo can answer the rest once you are inside.",
  },
  {
    target: "cta",
    kicker: "Step 6 of 6",
    title: "Ready when you are.",
    body: "Create your plan, and we will walk you through the product itself on your first visit.",
  },
];

export function SiteTour() {
  return <Tour steps={STEPS} storage="payhalo.tour.site.v1" auto eventName="payhalo:tour:site" label="PayHalo tour" />;
}

export function SiteTourButton({
  className = "btn btn-secondary btn-sm",
  children = "Take the tour",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event("payhalo:tour:site"))}
    >
      {children}
    </button>
  );
}
