"use client";

import { useState } from "react";
import { isAddress } from "viem";

export function AddressForm({
  initialValue,
  onSubmit,
}: {
  initialValue: string;
  onSubmit: (address: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  const valid = isAddress(value.trim());
  const showError = touched && value.trim().length > 0 && !valid;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (isAddress(value.trim())) onSubmit(value.trim());
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <label htmlFor="address" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-bone-muted">
          Wallet address — read only, no connection required
        </label>
        <input
          id="address"
          name="address"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x8BCC23b3352e9c450160676803AC5cfe1e2329e1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? "address-error" : undefined}
          className={`w-full border bg-dock-raised px-4 py-3 font-mono text-sm text-bone placeholder:text-bone-muted/60 focus:outline-none ${
            showError ? "border-duty" : "border-dock-line focus:border-kraft"
          }`}
        />
        {showError && (
          <p id="address-error" className="mt-1.5 font-mono text-[11px] text-duty">
            That doesn&apos;t parse as a 0x… address (42 hex characters).
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={value.trim().length === 0}
        className="border border-kraft bg-kraft px-6 py-3 font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-kraft-line transition-colors hover:bg-kraft-light disabled:cursor-not-allowed disabled:border-dock-line disabled:bg-dock-raised disabled:text-bone-muted sm:mt-6"
      >
        Inspect →
      </button>
    </form>
  );
}
