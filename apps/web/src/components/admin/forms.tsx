"use client";

import { useFormStatus } from "react-dom";

/** Shared admin form pieces. */
export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-ink";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
        variant === "primary" ? "bg-ink text-white hover:bg-ink/85" : "border border-line bg-surface hover:border-ink/40"
      }`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormError({ error }: { error?: string }) {
  return error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null;
}
