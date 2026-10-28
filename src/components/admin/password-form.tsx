"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";

import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { changePasswordAction } from "@/server/actions/auth";

export function PasswordForm() {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();

  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      const result = await changePasswordAction(csrf, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Senha atualizada.");
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      // Every session was invalidated: send the admin back to the login screen.
      router.push("/admin/login");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel max-w-lg space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Alterar senha</h2>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          Mínimo de 10 caracteres, com maiúsculas, minúsculas e números. Ao alterar, todas as sessões ativas
          são encerradas.
        </p>
      </div>

      <Field label="Senha atual" htmlFor="currentPassword" required error={errors.currentPassword}>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(event) => setValues((current) => ({ ...current, currentPassword: event.target.value }))}
        />
      </Field>

      <Field label="Nova senha" htmlFor="newPassword" required error={errors.newPassword}>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={(event) => setValues((current) => ({ ...current, newPassword: event.target.value }))}
        />
      </Field>

      <Field label="Confirmar nova senha" htmlFor="confirmPassword" required error={errors.confirmPassword}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={saving}>
          <KeyRound size={15} /> {saving ? "Salvando…" : "Alterar senha"}
        </Button>
      </div>
    </section>
  );
}
