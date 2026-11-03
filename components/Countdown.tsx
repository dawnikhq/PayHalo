"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/format";

export function Countdown({
  seconds,
  onExpire,
  compact = false,
}: {
  seconds: number;
  onExpire?: () => void;
  compact?: boolean;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => setLeft(seconds), [seconds]);

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          onExpire?.();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onExpire]);

  const { days, hours, minutes, seconds: secs } = countdownParts(left);

  if (compact) {
    return (
      <span className="mono text-ivory">
        {days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m
      </span>
    );
  }

  const cells = [
    { v: days, l: "days" },
    { v: hours, l: "hrs" },
    { v: minutes, l: "min" },
    { v: secs, l: "sec" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map((c) => (
        <div key={c.l} className="rounded-xl border border-white/8 bg-black/25 px-1 py-2.5 text-center">
          <div className="mono text-[20px] font-medium leading-none text-ivory">
            {String(c.v).padStart(2, "0")}
          </div>
          <div className="mt-1.5 text-[9px] uppercase tracking-[0.16em] text-muted">{c.l}</div>
        </div>
      ))}
    </div>
  );
}
