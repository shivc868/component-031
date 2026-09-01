"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { EASE, gsap, setupGsap } from "./gsap";
import { useIntro } from "./IntroProvider";

export interface NavLink {
  label: string;
  href: string;
}

export interface NavbarProps {
  brand?: string;
  links?: NavLink[];
  cta?: { label: string; href: string };
  className?: string;
}

/* Items start hidden inline so nothing flashes before GSAP takes over (autoAlpha reveals them). */
const HIDDEN = { visibility: "hidden" } as const;

const DEFAULT_LINKS: NavLink[] = [
  { label: "Why Us", href: "#why-us" },
  { label: "Beta", href: "#beta" },
  { label: "Join", href: "#join" },
  { label: "Contact", href: "#contact" },
];

function Logo() {
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      {/* two phases overlapping — the overlap is cut out with evenodd */}
      <path
        fillRule="evenodd"
        d="M11 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm12 0a11 11 0 1 0 0 22 11 11 0 0 0 0-22ZM17 5.1A8.9 8.9 0 0 1 20.1 12 8.9 8.9 0 0 1 17 18.9 8.9 8.9 0 0 1 13.9 12 8.9 8.9 0 0 1 17 5.1Z"
      />
    </svg>
  );
}

export function Navbar({
  brand = "Solene",
  links = DEFAULT_LINKS,
  cta = { label: "Join waitlist", href: "#join" },
  className = "",
}: NavbarProps) {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { register } = useIntro();

  /* Intro reveal */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    setupGsap();

    const ctx = gsap.context(() => {}, el);
    const items = gsap.utils.toArray<HTMLElement>("[data-nav-item]", el);
    gsap.set(items, { y: -14, autoAlpha: 0, willChange: "transform, opacity" });

    const unregister = register((tl, { reveal }) => {
      ctx.add(() => {
        tl.to(
          items,
          { y: 0, autoAlpha: 1, duration: 1, ease: EASE.settle, stagger: 0.06, clearProps: "willChange" },
          `${reveal}+=0.5`,
        );
      });
    });

    return () => {
      unregister();
      ctx.revert();
    };
  }, [register]);

  /* Mobile menu open / close */
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    setupGsap();
    const items = gsap.utils.toArray<HTMLElement>("[data-menu-item]", el);

    if (open) {
      document.documentElement.style.overflow = "hidden";
      gsap.set(el, { autoAlpha: 1 });
      const tl = gsap.timeline();
      tl.fromTo(
        el,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: EASE.unveil },
      );
      tl.fromTo(items, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: EASE.settle, stagger: 0.05 }, 0.25);
      return () => {
        tl.kill();
        document.documentElement.style.overflow = "";
      };
    }

    const tl = gsap.timeline({ onComplete: () => gsap.set(el, { autoAlpha: 0 }) });
    tl.to(items, { y: -10, autoAlpha: 0, duration: 0.3, ease: "power2.in", stagger: 0.02 });
    tl.to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.5, ease: "power3.inOut" }, 0.1);
    return () => {
      tl.kill();
    };
  }, [open]);

  /* Close on Escape / when resizing up to desktop */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header
      ref={root}
      className={`fixed inset-x-0 top-0 z-[60] flex items-center justify-between px-5 py-4 text-paper md:px-8 md:py-5 ${className}`}
    >
      <Link
        data-nav-item
        style={HIDDEN}
        href="/"
        className="relative z-10 flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.03em]"
      >
        <Logo />
        {brand}
      </Link>

      {/* Desktop links */}
      <nav
        data-nav-item
        style={HIDDEN}
        aria-label="Primary"
        className="hidden items-center gap-9 text-[15px] font-medium tracking-[-0.015em] text-paper/80 md:flex"
      >
        {links.map((l) => (
          <a key={l.href} href={l.href} className="transition-colors duration-300 hover:text-paper">
            {l.label}
          </a>
        ))}
      </nav>

      <div className="relative z-10 flex items-center gap-2.5">
        <a
          data-nav-item
          style={HIDDEN}
          href={cta.href}
          /* colour-only hover: a CSS transform transition here would fight GSAP's inline transforms during the reveal */
          className="rounded-full bg-paper px-4 py-2 text-[13px] font-semibold tracking-[-0.01em] text-ink transition-colors duration-300 hover:bg-ember hover:text-paper md:px-5 md:py-2.5 md:text-[14px]"
        >
          {cta.label}
        </a>

        {/* Mobile menu button */}
        <button
          data-nav-item
          style={HIDDEN}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full border border-paper/25 md:hidden"
        >
          <span
            className={`block h-px w-4 bg-paper transition-transform duration-300 ${open ? "translate-y-[3px] rotate-45" : ""}`}
          />
          <span
            className={`block h-px w-4 bg-paper transition-transform duration-300 ${open ? "-translate-y-[3px] -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        ref={panel}
        style={{ visibility: "hidden", clipPath: "inset(0% 0% 100% 0%)" }}
        className="fixed inset-0 z-0 flex flex-col justify-end bg-ink/95 px-6 pb-12 backdrop-blur-md md:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              data-menu-item
              href={l.href}
              onClick={() => setOpen(false)}
              className="block border-b border-paper/10 py-4 text-[2.25rem] leading-none font-medium tracking-[-0.04em] text-paper"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
