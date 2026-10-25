"use client";

import { useEffect, useRef } from "react";

const CORAL = "255, 122, 107"; // accent #FF7A6B
const TEAL = "0, 121, 107"; // primary #00796B

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  phase: number;
  teal: boolean;
}

/**
 * Full-screen canvas of softly drifting coral dots. Nearby dots are joined by faint lines,
 * and dots ease away from the mouse. Static when the user prefers reduced motion,
 * paused while the tab is hidden.
 */
export function DotsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999 };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;

    const seed = () => {
      const count = Math.round(Math.min(110, Math.max(36, (width * height) / 16000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 2 + Math.random() * 3.5,
        alpha: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        teal: Math.random() < 0.12, // a few teal dots for depth
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const linkDist = 130;

      for (const d of dots) {
        if (!reduceMotion) {
          // gentle repulsion from the cursor
          const dx = d.x - mouse.x;
          const dy = d.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 140 * 140 && dist2 > 0.01) {
            const f = (1 - Math.sqrt(dist2) / 140) * 0.06;
            d.vx += (dx / Math.sqrt(dist2)) * f;
            d.vy += (dy / Math.sqrt(dist2)) * f;
          }
          d.vx = Math.max(-0.6, Math.min(0.6, d.vx * 0.995));
          d.vy = Math.max(-0.6, Math.min(0.6, d.vy * 0.995));
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < -10) d.x = width + 10;
          if (d.x > width + 10) d.x = -10;
          if (d.y < -10) d.y = height + 10;
          if (d.y > height + 10) d.y = -10;
        }
      }

      // faint links between close dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(${CORAL}, ${0.18 * (1 - dist / linkDist)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const d of dots) {
        const twinkle = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(time / 900 + d.phase);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.teal ? TEAL : CORAL}, ${d.alpha * twinkle * (d.teal ? 0.6 : 1)})`;
        ctx.fill();
      }

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* soft colour washes behind the dots */}
      <div className="absolute -top-40 -start-40 size-[36rem] rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute -bottom-48 -end-32 size-[40rem] rounded-full bg-accent/15 blur-3xl" />
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
