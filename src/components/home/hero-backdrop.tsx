"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "@/components/site/theme";

const SPACING = 30;
const REACH = 170;

/**
 * Fundo do hero: uma malha de pontos que acende e se afasta do cursor, com uma
 * onda lenta passando por ela. Só anima enquanto está visível e respeita
 * `prefers-reduced-motion` (nesse caso desenha a malha uma única vez).
 */
export function HeroBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--color-accent").trim();
    const idle = styles.getPropertyValue("--color-base-500").trim();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      for (let x = SPACING / 2; x < width; x += SPACING) {
        for (let y = SPACING / 2; y < height; y += SPACING) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);
          const near = Math.max(0, 1 - distance / REACH);
          // Onda diagonal lenta: dá vida à malha mesmo sem o cursor por perto.
          const wave = still ? 0 : Math.max(0, Math.sin((x + y) / 190 - time / 1700)) ** 6 * 0.5;
          const glow = Math.max(near, wave);
          const push = near * 9;

          context.globalAlpha = 0.28 + glow * 0.72;
          context.fillStyle = glow > 0.04 ? accent : idle;
          context.beginPath();
          context.arc(
            x + (distance ? (dx / distance) * push : 0),
            y + (distance ? (dy / distance) * push : 0),
            1.1 + glow * 1.5,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }
    };

    const loop = (time: number) => {
      draw(time);
      if (visible && !still) frame = requestAnimationFrame(loop);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      if (still) draw(0);
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(loop);
    });

    const onResize = () => {
      resize();
      draw(performance.now());
    };

    resize();
    observer.observe(canvas);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_at_top,black_25%,transparent_78%)]"
    />
  );
}
