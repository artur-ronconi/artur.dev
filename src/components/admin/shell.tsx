"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Award,
  Boxes,
  ExternalLink,
  FolderGit2,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/site/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/projetos", label: "Projetos", icon: FolderGit2 },
  { href: "/admin/tecnologias", label: "Tecnologias", icon: Boxes },
  { href: "/admin/experiencias", label: "Experiências", icon: UserRound },
  { href: "/admin/certificacoes", label: "Certificações", icon: Award },
  { href: "/admin/midia", label: "Mídia", icon: ImageIcon },
  { href: "/admin/mensagens", label: "Mensagens", icon: Mail },
  { href: "/admin/perfil", label: "Portfólio", icon: Settings },
  { href: "/admin/conta", label: "Conta", icon: ShieldCheck },
] as const;

export function AdminShell({
  user,
  children,
  unreadMessages = 0,
  logout,
}: {
  user: { name: string; email: string };
  children: ReactNode;
  unreadMessages?: number;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label="Navegação do painel" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, "exact" in item ? item.exact : false);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:bg-base-800 hover:text-ink",
            )}
          >
            <Icon size={16} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.href === "/admin/mensagens" && unreadMessages > 0 ? (
              <span className="rounded-full bg-accent-strong px-1.5 py-0.5 text-[10px] font-semibold text-base-950">
                {unreadMessages}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-base-950">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-base-900 p-4 lg:flex">
        <Link href="/admin" className="mb-6 block px-1">
          <Logo />
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            painel administrativo
          </span>
        </Link>

        {nav}

        <div className="mt-auto space-y-3 pt-6">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-muted transition-colors hover:text-accent"
            >
              <ExternalLink size={15} /> Ver site público
            </Link>
            <ThemeToggle />
          </div>

          <div className="rounded-lg border border-line bg-base-850 p-3">
            <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[11.5px] text-ink-faint">{user.email}</p>
            <form action={logout} className="mt-2.5">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-2 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:border-rose/40 hover:text-rose"
              >
                <LogOut size={13} /> Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-base-950/90 px-4 backdrop-blur lg:hidden">
          <Link href="/admin">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className="rounded-lg border border-line p-2 text-ink-muted"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {open ? (
          <div className="border-b border-line bg-base-900 p-4 lg:hidden">
            {nav}
            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-2 py-2 text-[13px] text-ink-muted"
              >
                <LogOut size={14} /> Sair
              </button>
            </form>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 text-[13.5px] text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
