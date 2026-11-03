export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] border border-brass/35 bg-gradient-to-b from-brass/25 to-brass/5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="9" r="4.1" stroke="#e8c68a" strokeWidth="1.6" />
          <path d="M12 13.2V21" stroke="#e8c68a" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 17.4h3.1" stroke="#e8c68a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-medium tracking-[0.16em] text-ivory">
          HACK<span className="text-brass">1</span>
        </span>
      )}
    </span>
  );
}
