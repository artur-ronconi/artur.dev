"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, Menu, X } from "lucide-react";

import { BrandIcon } from "@/components/icons/brand-icons";

import { Logo } from "@/components/icons/logo";
import { CommandPalette, type PaletteData } from "@/components/site/command-palette";
import { ThemeToggle } from "@/components/site/theme";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

export function SiteHeader({
  items,
  githubUrl,
  linkedinUrl,
  resumeUrl,
  palette,
}: {
  items: NavItem[];
  palette: PaletteData;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const pathname = usePathname();
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      // Barra de progresso de leitura, atualizada sem re-renderizar o header.
      const range = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current?.style.setProperty("transform", `scaleX(${range > 0 ? window.scrollY / range : 0})`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlights the section currently in view on the home page.
  useEffect(() => {
    if (pathname !== "/") return;

    const ids = items.filter((item) => item.href.startsWith("/#")).map((item) => item.href.slice(2));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveHash(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.2, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items, pathname]);

  // Fora da home nenhuma âncora fica ativa, sem precisar limpar o estado.
  const currentHash = pathname === "/" ? activeHash : "";

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return pathname === "/" && currentHash === href.slice(1);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled || open
          ? "border-line bg-base-950/85 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Página inicial" className="rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.href) ? "text-accent" : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
              {isActive(item.href) ? (
                <span aria-hidden className="absolute inset-x-3 -bottom-px h-px bg-accent" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CommandPalette data={palette} />
          <ThemeToggle />

          <div className="hidden items-center gap-1 sm:flex">
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-800 hover:text-ink"
              >
                <BrandIcon name="github" size={18} />
              </a>
            ) : null}
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-base-800 hover:text-ink"
              >
                <BrandIcon name="linkedin" size={18} />
              </a>
            ) : null}
          </div>

          {resumeUrl ? (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary", "sm", "hidden sm:inline-flex")}
            >
              Baixar CV
              <Download size={15} />
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="rounded-lg border border-line p-2 text-ink-muted transition-colors hover:text-ink lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <span
        ref={progressRef}
        aria-hidden
        className="absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-gradient-to-r from-accent-strong to-accent"
      />

      {open ? (
        <nav
          id="menu-mobile"
          aria-label="Navegação mobile"
          className="border-t border-line bg-base-950/95 px-5 py-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm text-ink-muted transition-colors hover:bg-base-850 hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {resumeUrl ? (
              <li>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-3 text-sm text-accent"
                >
                  Baixar CV
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
