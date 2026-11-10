"use client";

import { useState } from "react";

export function SupportRequest() {
  const [sent, setSent] = useState(false);

  return (
    <div>
      <button
        onClick={() => setSent(true)}
        className="btn w-full bg-white text-[var(--color-forest)] hover:bg-[#f2f7f2]"
        disabled={sent}
      >
        {sent ? "Request recorded" : "Send request"}
      </button>
      <p className="mt-2 text-[11px] text-[#8fb098]">
        {sent
          ? "Nothing was sent. This concept has no support inbox — get in touch with your plan contact instead."
          : "No real message is sent."}
      </p>
    </div>
  );
}
