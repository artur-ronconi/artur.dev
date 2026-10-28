import Link from "next/link";
import {
  AlertTriangle,
  Award,
  Boxes,
  FileText,
  FolderGit2,
  Mail,
  PlusCircle,
  Star,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/admin/shell";
import { DemoDataCard } from "@/components/admin/demo-data-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { getDashboardStats } from "@/server/modules/projects";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Projetos cadastrados", value: stats.total, icon: FolderGit2, href: "/admin/projetos" },
    { label: "Publicados", value: stats.published, icon: FileText, href: "/admin/projetos?status=PUBLISHED" },
    { label: "Rascunhos", value: stats.drafts, icon: FileText, href: "/admin/projetos?status=DRAFT" },
    { label: "Em destaque", value: stats.featured, icon: Star, href: "/admin/projetos" },
    { label: "Tecnologias", value: stats.technologies, icon: Boxes, href: "/admin/tecnologias" },
    { label: "Experiências", value: stats.experiences, icon: UserRound, href: "/admin/experiencias" },
    { label: "Certificações", value: stats.certifications, icon: Award, href: "/admin/certificacoes" },
    { label: "Mensagens não lidas", value: stats.unreadMessages, icon: Mail, href: "/admin/mensagens" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do conteúdo publicado no portfólio."
        action={
          <>
            <ButtonLink href="/admin/projetos/novo" size="sm">
              <PlusCircle size={15} /> Novo projeto
            </ButtonLink>
            <ButtonLink href="/admin/perfil" variant="secondary" size="sm">
              Editar portfólio
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="panel panel-hover p-4">
              <span className="flex items-center justify-between">
                <span className="text-[12.5px] text-ink-muted">{card.label}</span>
                <Icon size={15} className="text-ink-faint" aria-hidden />
              </span>
              <span className="mt-2 block font-display text-2xl font-semibold text-ink">{card.value}</span>
            </Link>
          );
        })}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-[15px] font-semibold text-ink">Últimos projetos atualizados</h2>
          {stats.recent.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-muted">
              Nenhum projeto cadastrado.{" "}
              <Link href="/admin/projetos/novo" className="text-accent">
                Criar o primeiro
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {stats.recent.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/admin/projetos/${project.id}`}
                    className="min-w-0 flex-1 truncate text-[13.5px] text-ink hover:text-accent"
                  >
                    {project.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    {project.featured ? <Star size={13} className="text-amber" aria-label="Destaque" /> : null}
                    <Badge tone={project.status === "PUBLISHED" ? "emerald" : "neutral"} mono>
                      {project.status === "PUBLISHED" ? "publicado" : "rascunho"}
                    </Badge>
                    <span className="font-mono text-[11px] text-ink-faint">{timeAgo(project.updatedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <AlertTriangle size={15} className="text-amber" aria-hidden />
            Projetos publicados incompletos
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Projetos sem capa ou sem seções de conteúdo aparecem aqui.
          </p>
          {stats.incomplete.length === 0 ? (
            <p className="mt-4 text-[13px] text-emerald">Tudo certo: nenhum projeto publicado está incompleto.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {stats.incomplete.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/admin/projetos/${project.id}`}
                    className="min-w-0 flex-1 truncate text-[13.5px] text-ink hover:text-accent"
                  >
                    {project.title}
                  </Link>
                  <span className="flex gap-1.5">
                    {!project.coverImageUrl ? <Badge tone="amber" mono>sem capa</Badge> : null}
                    {project._count.sections === 0 ? <Badge tone="amber" mono>sem seções</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {stats.demo > 0 ? <DemoDataCard count={stats.demo} /> : null}
    </>
  );
}
