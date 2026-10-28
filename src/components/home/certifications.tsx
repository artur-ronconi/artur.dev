import { Award, ExternalLink } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import type { getCertifications } from "@/server/modules/portfolio";

type Certifications = Awaited<ReturnType<typeof getCertifications>>;

export function Certifications({ certifications }: { certifications: Certifications }) {
  return (
    <Section id="certificacoes">
      <SectionHeading
        label="Credenciais"
        title="Certificações"
        description="Certificações técnicas cadastradas no painel administrativo."
      />

      {certifications.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Award size={20} />}
          title="Nenhuma certificação cadastrada"
          description="Assim que você adicionar certificações no admin, elas aparecerão aqui com emissor, data e link de verificação."
        />
      ) : (
        <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certifications.map((certification, index) => (
            <Reveal key={certification.id} as="li" delay={index * 70}>
              <article className="panel panel-hover flex h-full gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent">
                  <Award size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14.5px] font-semibold leading-snug text-ink">{certification.name}</h3>
                  <p className="mt-1 text-[13px] text-ink-muted">{certification.issuer}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-ink-faint">
                    {[certification.issuedAt, certification.expiresAt].filter(Boolean).join(" → ")}
                  </p>
                  {certification.credentialUrl ? (
                    <a
                      href={certification.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:opacity-80"
                    >
                      Verificar credencial <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      )}
    </Section>
  );
}
