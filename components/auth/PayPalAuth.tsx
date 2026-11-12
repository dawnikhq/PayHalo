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
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#003087] text-[11px] font-bold leading-none text-white"
        >
          P
        </span>
        {from === "signup" ? "Sign up with PayPal" : "Continue with PayPal"}
      </a>
    </div>
  );
}

const WORDS: Record<string, string> = {
  noemail: "PayPal did not share an email address, so there is no account to open. Try again, or use your email below.",
  cancelled: "You cancelled at PayPal. Nothing was created and nothing changed.",
  failed: "PayPal could not finish that sign-in. Nothing changed — try again, or use your password below.",
  unavailable: "PayPal sign-in is not available just now. Use your password or a one-time link.",
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
