"use client";

import { useLayoutEffect, useRef } from "react";
import { EASE, gsap, setupGsap, SplitText } from "./gsap";
import { useIntro } from "./IntroProvider";

/* Shared by Hero (static) and Preloader (fades in while the image opens) so
   the hand-off between the two layers is pixel-identical. */
export const HERO_GRADIENT =
  "linear-gradient(to top, rgba(28,22,19,0.6) 0%, rgba(28,22,19,0.16) 40%, rgba(28,22,19,0.08) 65%, rgba(28,22,19,0.38) 100%)";
export const IMAGE_FILTER = "sepia(0.3) saturate(1.15) contrast(1.03)";

export interface HeroProps {
  /** Background image. Use the same URL as the last Preloader image. */
  image: string;
  title: string;
  subtitle?: string;
  className?: string;
}

const SPLIT_VARS = { type: "lines", mask: "lines", linesClass: "line" } as const;

export function Hero({ image, title, subtitle, className = "" }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const intro = useIntro();
  const { register, status } = intro;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    setupGsap();

    const ctx = gsap.context(() => {}, el);
    const content = el.querySelector<HTMLElement>("[data-hero-content]")!;
    const heading = el.querySelector<HTMLElement>("[data-hero-title]")!;
    const sub = el.querySelector<HTMLElement>("[data-hero-sub]");

    // Stays hidden (inline visibility) until the intro reveals it; text is still in the HTML for SEO.
    gsap.set(content, { autoAlpha: 0 });

    let splits: SplitText[] = [];
    let revealed = false;

    // Overflow-hidden line masks clip descenders (g, y, p); give them room.
    const padMasks = () =>
      gsap.set(
        splits.flatMap((s) => s.masks),
        { paddingBottom: "0.16em", marginBottom: "-0.16em" },
      );

    const split = () => {
      splits.forEach((s) => s.revert());
      splits = [heading, sub].filter(Boolean).map((t) => SplitText.create(t as HTMLElement, SPLIT_VARS));
      padMasks();
    };

    const unregister = register((tl, { reveal }) => {
      ctx.add(() => {
        split();
        const [h, s] = splits;
        gsap.set(content, { autoAlpha: 1 });
        gsap.set(
          splits.flatMap((x) => x.lines),
          { yPercent: 120, willChange: "transform" },
        );

        tl.to(h.lines, { yPercent: 0, duration: 1.5, ease: EASE.settle, stagger: 0.12 }, reveal);
        if (s) tl.to(s.lines, { yPercent: 0, duration: 1.3, ease: EASE.settle, stagger: 0.08 }, `${reveal}+=0.35`);
        tl.call(
          () => {
            revealed = true;
            gsap.set(
              splits.flatMap((x) => x.lines),
              { clearProps: "willChange" },
            );
          },
          [],
          `${reveal}+=2`,
        );
      });
    });

    // SplitText lines are white-space: nowrap -> re-split when the width changes.
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (!revealed || window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      split();
    };
    window.addEventListener("resize", onResize);

    return () => {
      unregister();
      window.removeEventListener("resize", onResize);
      splits.forEach((s) => s.revert());
      ctx.revert();
    };
  }, [register]);

  return (
    <section
      ref={root}
      className={`relative h-svh w-full overflow-hidden bg-cream text-paper ${className}`}
      aria-label={title}
    >
      {/* Background — identical to the Preloader's center frame for a seamless hand-off */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
          style={{ filter: IMAGE_FILTER }}
        />
        <div className="pointer-events-none absolute inset-0 bg-ember/20 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0" style={{ background: HERO_GRADIENT }} />
      </div>

      {/* Content sits above the Preloader overlay while the intro runs */}
      {/* Hidden inline until GSAP reveals it, so there is no flash before hydration */}
      <div
        data-hero-content
        className={`absolute inset-0 flex items-center justify-center px-6 text-center ${
          status === "done" ? "z-10" : "z-50"
        }`}
        style={{ visibility: "hidden" }}
      >
        <div className="w-full min-w-0 max-w-full">
          <h1
            data-hero-title
            className="mx-auto max-w-[11ch] text-[clamp(2.75rem,8.2vw,8.5rem)] leading-none font-medium tracking-[-0.055em]"
          >
            {title}
          </h1>
          {subtitle && (
            <p
              data-hero-sub
              className="mx-auto mt-6 max-w-[34ch] text-[15px] leading-normal tracking-[-0.015em] text-paper/78 md:mt-8 md:text-[17px]"
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
