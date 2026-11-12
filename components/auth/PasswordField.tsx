"use client";

import { useState } from "react";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white pl-3 pr-[68px] text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

/**
 * A password box with a Show / Hide switch.
 *
 * Typing a long password blind on a phone is how people end up locked out of
 * their own account, so the letters can be revealed — for this field, right now,
 * without changing anything that is stored. The switch is a button, so it works
 * from the keyboard, and it says what it does rather than showing an eye.
 */
export function PasswordField({
  id,
  label: text,
  value,
  onChange,
  placeholder = "Your password",
  autoComplete = "current-password",
  minLength,
  autoFocus = false,
  required = true,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
  autoFocus?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={input}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute right-1.5 top-1/2 mt-[3px] -translate-y-1/2 rounded-[9px] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-mint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="t-meta mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}
