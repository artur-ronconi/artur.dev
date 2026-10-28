"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Copy, Mail, MapPin, Phone, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { submitContactMessageAction } from "@/server/actions/contact";
import type { ActionResult } from "@/server/actions/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Enviando…" : "Enviar mensagem"}
      <Send size={16} />
    </Button>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={`Copiar ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value);
      }}
      className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-base-800 hover:text-ink"
    >
      <Copy size={14} />
    </button>
  );
}

export function Contact({
  heading,
  text,
  email,
  phone,
  location,
  available,
  availabilityNote,
}: {
  heading?: string | null;
  text?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  available: boolean;
  availabilityNote?: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitContactMessageAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const fieldError = (name: string) =>
    state && !state.ok ? (state.fieldErrors?.[name] ?? null) : null;

  return (
    <Section id="contato">
      <SectionHeading
        label="Contato"
        title={heading ?? "Vamos conversar"}
        description={text ?? "Aberto a novas oportunidades e a projetos técnicos desafiadores."}
      />

      <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Reveal className="panel flex h-fit flex-col gap-3 p-6">
          {email ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-base-900 px-3.5 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <Mail size={16} className="shrink-0 text-accent" aria-hidden />
                <a href={`mailto:${email}`} className="truncate text-[13.5px] text-ink hover:text-accent">
                  {email}
                </a>
              </span>
              <CopyButton value={email} label="e-mail" />
            </div>
          ) : null}

          {phone ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-base-900 px-3.5 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <Phone size={16} className="shrink-0 text-accent" aria-hidden />
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="truncate text-[13.5px] text-ink hover:text-accent">
                  {phone}
                </a>
              </span>
              <CopyButton value={phone} label="telefone" />
            </div>
          ) : null}

          {location ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-base-900 px-3.5 py-3">
              <MapPin size={16} className="shrink-0 text-accent" aria-hidden />
              <span className="truncate text-[13.5px] text-ink">{location}</span>
            </div>
          ) : null}

          {available ? (
            <p className="mt-1 inline-flex items-center gap-2 text-[13px] text-emerald">
              <span aria-hidden className="h-2 w-2 rounded-full bg-emerald" />
              {availabilityNote ?? "Disponível para novas oportunidades"}
            </p>
          ) : null}
        </Reveal>

        <Reveal delay={90} className="panel p-6">
          <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Field label="Nome" htmlFor="contact-name" required error={fieldError("name")}>
              <Input
                id="contact-name"
                name="name"
                autoComplete="name"
                required
                aria-invalid={Boolean(fieldError("name"))}
                placeholder="Seu nome"
              />
            </Field>

            <Field label="E-mail" htmlFor="contact-email" required error={fieldError("email")}>
              <Input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={Boolean(fieldError("email"))}
                placeholder="voce@empresa.com"
              />
            </Field>

            <Field label="Assunto" htmlFor="contact-subject" className="sm:col-span-2" error={fieldError("subject")}>
              <Input id="contact-subject" name="subject" placeholder="Sobre o que quer falar?" />
            </Field>

            <Field label="Mensagem" htmlFor="contact-message" required className="sm:col-span-2" error={fieldError("message")}>
              <Textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                aria-invalid={Boolean(fieldError("message"))}
                placeholder="Conte um pouco sobre a oportunidade ou o projeto."
              />
            </Field>

            {/* Honeypot — oculto para pessoas, visível para bots. */}
            <div aria-hidden className="hidden">
              <label htmlFor="contact-website">Não preencha este campo</label>
              <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="sm:col-span-2">
              {state ? (
                <p
                  role="status"
                  className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] ${
                    state.ok
                      ? "border-emerald/30 bg-emerald/10 text-emerald"
                      : "border-rose/30 bg-rose/10 text-rose"
                  }`}
                >
                  {state.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  {state.message}
                </p>
              ) : null}
              <SubmitButton />
            </div>
          </form>
        </Reveal>
      </div>
    </Section>
  );
}
