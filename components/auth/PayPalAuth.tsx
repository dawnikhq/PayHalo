/**
 * The PayPal mark, in PayPal's own two blues.
 *
 * Traced from the open-source icon set rather than scraped from a brand page:
 * one path, filled with a gradient between #003087 and #009CDE, which is what
 * the monogram looks like on the button PayPal itself publishes. It is drawn at
 * one size, never stretched, and never recoloured beyond the brand pair.
 */
function PayPalMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="paypal-mark-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#003087" />
          <stop offset="55%" stopColor="#00457C" />
          <stop offset="100%" stopColor="#009CDE" />
        </linearGradient>
      </defs>
      <path
        fill="url(#paypal-mark-blue)"
        d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"
      />
    </svg>
  );
}

/**
 * Signing in with PayPal instead of a password.
 *
 * The only thing taken is the address PayPal has already proved: no balance, no
 * payment permission, no consent to move money. Whichever screen the button sits
 * on, the handshake is the same — `from` only decides where a failure returns.
 */
export function PayPalAuthButton({
  from,
  next = "/dashboard",
}: {
  from: "signin" | "signup";
  next?: string;
}) {
  const href = `/api/auth/paypal/start?from=${from}&next=${encodeURIComponent(next)}`;

  return (
    <div>
      <a href={href} className="btn btn-secondary flex w-full items-center justify-center gap-2">
        <PayPalMark />
        {from === "signup" ? "Sign up with PayPal" : "Continue with PayPal"}
      </a>
    </div>
  );
}

const WORDS: Record<string, string> = {
  noemail: "PayPal did not pass on an address and the extra step could not start. Try again, or use your email below.",
  cancelled: "You cancelled at PayPal. Nothing was created and nothing changed.",
  failed: "PayPal could not finish that sign-in. Nothing changed — try again, or use your password below.",
  unavailable: "PayPal sign-in is not available just now. Use your password or a one-time link.",
  checkemail:
    "That PayPal account is already linked here. We emailed the confirmation link again — one click and the plan opens.",
  expired: "That PayPal sign-in timed out before it was finished. Press the button again — nothing was lost.",
};

/** The sentence for whatever PayPal sent us back with. */
export function PayPalNotice({ code }: { code?: string }) {
  if (!code) return null;
  const body = WORDS[code] ?? WORDS.failed;

  return (
    <p
      role="status"
      className={`mb-4 rounded-[12px] px-3 py-2.5 text-[12px] leading-relaxed ${
        code === "unavailable"
          ? "bg-[#f6f1e3] text-[var(--color-warnink)]"
          : "bg-[#fdf1ee] text-[var(--color-ember)]"
      }`}
    >
      {body}
    </p>
  );
}

/** The line that separates PayPal from the password form. */
export function OrDivider({ children = "or" }: { children?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--color-line)]" />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[var(--color-line)]" />
    </div>
  );
}
