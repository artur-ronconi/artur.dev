import { ArrowRight, Mail, MapPin } from "lucide-react";

import { BrandIcon } from "@/components/icons/brand-icons";

import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { HeroWorkbench, type WorkbenchData } from "@/components/home/workbench/hero-workbench";
import { TechIcon } from "@/components/icons/tech-icon";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import type { PortfolioSettingsView } from "@/server/modules/portfolio";

type HighlightChip = { name: string; caption: string; iconSlug: string };

const CHIPS: HighlightChip[] = [
  { name: "Node.js", caption: "Backend", iconSlug: "nodedotjs" },
  { name: "AWS", caption: "Cloud", iconSlug: "aws" },
  { name: "Docker", caption: "Containers", iconSlug: "docker" },
  { name: "Terraform", caption: "IaC", iconSlug: "terraform" },
  { name: "CI/CD", caption: "Automação", iconSlug: "ci-cd" },
];

export function Hero({
  settings,
  projects,
  stack,
}: {
  settings: PortfolioSettingsView;
  projects: WorkbenchData["projects"];
  stack: WorkbenchData["stack"];
}) {
  // O destaque do hero é editável; por padrão usa o nome completo.
  const highlighted = settings.heroHighlight?.trim() || settings.fullName;
  const [firstName, ...restName] = highlighted.split(" ");

  return (
    <section id="inicio" className="relative overflow-hidden px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-10">
      <HeroBackdrop />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-accent/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-40 h-[380px] w-[380px] rounded-full bg-emerald/10 blur-[120px]"
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          {settings.avatarUrl || settings.heroBadge ? (
            <Reveal className="flex flex-wrap items-center gap-4">
              {settings.avatarUrl ? (
                <Avatar
                  src={settings.avatarUrl}
                  alt={`Foto de ${settings.fullName}`}
                  size={96}
                  priority
                  online={settings.available}
                />
              ) : null}
              {settings.heroBadge ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-line" />
                  {settings.heroBadge}
                </span>
              ) : null}
            </Reveal>
          ) : null}

          <Reveal delay={60}>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              <span className="block text-ink-muted">{settings.heroTitle ?? "Olá, eu sou"}</span>
              <span className="mt-1 block">
                <span className="text-gradient">{firstName}</span>{" "}
                <span className="text-ink">{restName.join(" ")}</span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-base font-medium text-ink sm:text-lg">
              {(settings.heroSubtitle ?? settings.headline).split("·").map((part, index, array) => (
                <span key={part} className="inline-flex items-center gap-2">
                  <span className={index === 0 ? "text-ink" : "text-ink-muted"}>{part.trim()}</span>
                  {index < array.length - 1 ? (
                    <span aria-hidden className="text-accent/50">
                      /
                    </span>
                  ) : null}
                </span>
              ))}
            </p>
          </Reveal>

          {settings.heroDescription ? (
            <Reveal delay={180}>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">
                {settings.heroDescription}
              </p>
            </Reveal>
          ) : null}

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/projetos" size="lg">
                Ver projetos
                <ArrowRight size={17} />
              </ButtonLink>

              {settings.githubUrl ? (
                <ExternalButtonLink href={settings.githubUrl} variant="secondary" size="lg">
                  <BrandIcon name="github" size={17} />
                  GitHub
                </ExternalButtonLink>
              ) : null}

              <ButtonLink href="/#contato" variant="outline" size="lg">
                <Mail size={17} />
                Entrar em contato
              </ButtonLink>
            </div>
          </Reveal>

          {settings.location || settings.available ? (
            <Reveal delay={300}>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-faint">
                {settings.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-accent/70" />
                    {settings.location}
                  </span>
                ) : null}
                {settings.available ? (
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                    {settings.availabilityNote ?? "Disponível para novas oportunidades"}
                  </span>
                ) : null}
              </div>
            </Reveal>
          ) : null}
        </div>

        <Reveal delay={120} className="lg:pl-4">
          <HeroWorkbench
            data={{
              name: settings.fullName,
              headline: settings.headline,
              location: settings.location,
              email: settings.email,
              availability: settings.available
                ? (settings.availabilityNote ?? "Disponível para novas oportunidades")
                : null,
              githubUrl: settings.githubUrl,
              linkedinUrl: settings.linkedinUrl,
              resumeUrl: settings.resumeUrl,
              projects,
              stack,
            }}
          />
        </Reveal>
      </div>

      <Reveal delay={360} className="relative mx-auto mt-14 w-full max-w-7xl sm:mt-20">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CHIPS.map((chip) => (
            <li
              key={chip.name}
              className="panel panel-hover flex items-center gap-3 px-3.5 py-3"
            >
              <TechIcon slug={chip.iconSlug} name={chip.name} size={22} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{chip.name}</span>
                <span className="block truncate font-mono text-[11px] text-ink-faint">{chip.caption}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
