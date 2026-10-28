"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/actions/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
      <LogIn size={15} />
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(loginAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <Field label="E-mail" htmlFor="email" required error={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          aria-invalid={Boolean(errors?.email)}
          placeholder="voce@exemplo.com"
        />
      </Field>

      <Field label="Senha" htmlFor="password" required error={errors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors?.password)}
          placeholder="••••••••••"
        />
      </Field>

      {state && !state.ok ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose/30 bg-rose/10 px-3 py-2.5 text-[13px] text-rose"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
