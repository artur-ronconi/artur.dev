import { CheckCircle2, User } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { renderMarkdown } from "@/lib/markdown";
import type { PortfolioSettingsView } from "@/server/modules/portfolio";

export function About({ settings }: { settings: PortfolioSettingsView }) {
  const hasAbout = Boolean(settings.about?.trim());
  const summaryItems = settings.summaryItems ?? [];

  if (!hasAbout && summaryItems.length === 0) return null;

  return (
    <Section id="sobre">
      <SectionHeading label="Perfil" title="Sobre mim" />

      <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {hasAbout ? (
          <Reveal className="panel p-6 sm:p-7">
            <div className="flex items-center gap-4">
              {settings.avatarUrl ? (
                <Avatar src={settings.avatarUrl} alt={`Foto de ${settings.fullName}`} size={72} />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-base-800 text-ink-faint">
                  <User size={20} aria-hidden />
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-ink">{settings.fullName}</p>
                <p className="text-[12.5px] text-ink-faint">{settings.headline}</p>
              </div>
            </div>

            <div
              className="prose-portfolio mt-6 text-[14.5px]"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(settings.about ?? "") }}
            />
          </Reveal>
        ) : null}

        {summaryItems.length > 0 ? (
          <Reveal delay={90} className="panel p-6 sm:p-7">
            <h3 className="text-[15px] font-semibold text-ink">Resumo profissional</h3>
            <ul className="mt-5 space-y-3.5">
              {summaryItems.map((item) => (
                <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-muted">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </Section>
  );
}
