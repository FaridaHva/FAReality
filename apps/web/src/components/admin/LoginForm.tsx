"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { FormError, inputClass, SubmitButton } from "./forms";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-line bg-surface p-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">FAReality admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Giriş</h1>
      </div>
      <input name="password" type="password" required autoFocus placeholder="Şifrə" className={inputClass} />
      <FormError error={state?.error} />
      <SubmitButton pendingText="Yoxlanılır…">Daxil ol</SubmitButton>
    </form>
  );
}
