"use client";

import { useLayoutEffect, useRef } from "react";
import { EASE, gsap, setupGsap } from "./gsap";
import { useIntro } from "./IntroProvider";
import { HERO_GRADIENT, IMAGE_FILTER } from "./Hero";

export interface PreloaderProps {
  /** Image URLs. The LAST one lands in the center and opens to full screen —
   *  pass the same URL as the Hero `image` for a seamless hand-off. Use an odd
   *  count (7 recommended) so the column is symmetrical. */
  images: string[];
  /** Aspect ratio of every frame. */
  ratio?: number;
  /** Each stacked frame is this fraction of its neighbour closer to the center. */
  fanRatio?: number;
  /** Gap before each stacked frame, as a fraction of that frame's own height. */
  fanGap?: number;
  /** Center frame height as a fraction of the viewport (upper bound). */
  centerHeight?: number;
  label?: string;
  className?: string;
}

const clip = (v: number, h: number) => `inset(${v}% ${h}% ${v}% ${h}%)`;
const HIDDEN = clip(50, 50);

/* Geometry: the center frame is a full-viewport element clipped to a centered
   window; the others are real boxes of the same size. The window is sized so the
   whole column (center + rings above/below) fits the viewport. */
function getLayout(rings: number, ratio: number, fanRatio: number, fanGap: number, centerHeight: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scales = Array.from({ length: rings }, (_, i) => fanRatio ** (i + 1));

  const halfColumn = 0.5 + scales.reduce((a, s) => a + s * (1 + fanGap), 0);
  let height = Math.min(vh * centerHeight, (vw * 0.62) / ratio);
  height = Math.min(height, (vh * 0.48) / halfColumn);
  const width = height * ratio;

  const offsets: number[] = [];
  let edge = height / 2;
  scales.forEach((s) => {
    const gap = fanGap * s * height;
    offsets.push(edge + gap + (s * height) / 2);
    edge += gap + s * height;
  });

  return {
    width,
    height,
    scales,
    offsets,
    h: ((1 - width / vw) / 2) * 100, // center frame left/right inset %
    v: ((1 - height / vh) / 2) * 100, // center frame top/bottom inset %
  };
}

/** Waits for an image to be decodable, but never longer than `ms`. */
const decodeWithin = (img: HTMLImageElement, ms: number) =>
  Promise.race([img.decode().catch(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);

export function Preloader({
  images,
  ratio = 3 / 2,
  fanRatio = 0.68,
  fanGap = 0.12,
  centerHeight = 0.24,
  label = "Loading",
  className = "",
}: PreloaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const { status, claim, conduct } = useIntro();
  const center = images.length - 1;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    setupGsap();
    claim();

    // Lock scrolling for the duration of the intro.
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    let cancelled = false;
    let ctx: gsap.Context | undefined;

    const frames = gsap.utils.toArray<HTMLElement>("[data-frame]", el);
    const imgs = frames.map((f) => f.querySelector("img") as HTMLImageElement);
    const last = frames[center];
    const lastImg = imgs[center];
    const others = frames.slice(0, center);

    const run = async () => {
      // Correct SplitText line breaks in the Hero + no blank center frame.
      await Promise.all([document.fonts.ready, decodeWithin(lastImg, 2500)]);
      if (cancelled) return;

      ctx = gsap.context(() => {
        const counterEl = el.querySelector<HTMLElement>("[data-counter]")!;
        const counterWrap = el.querySelector<HTMLElement>("[data-counter-wrap]")!;
        const overlay = el.querySelector<HTMLElement>("[data-overlay]")!;
        const rings = Math.ceil(others.length / 2);
        const { width: W, height: HT, scales, offsets, h: H, v: V } = getLayout(rings, ratio, fanRatio, fanGap, centerHeight);

        // Initial states: everything stacked in the center, fully clipped.
        gsap.set(last, { clipPath: HIDDEN });
        gsap.set(others, { width: W, height: HT, xPercent: -50, yPercent: -50, y: 0, scale: 1, clipPath: HIDDEN });
        const REVEAL_ZOOM = 1.16; // center image stays slightly zoomed until the final open

        conduct((tl) => {
          /* 1. Reveal: every frame opens its clip-path from the middle outwards. */
          const REVEAL = 0.55;
          const REVEAL_STEP = 0.13;
          frames.forEach((frame, i) => {
            const isCenter = i === center;
            const p = { v: 50, h: 50 };
            tl.to(
              p,
              {
                v: isCenter ? V : 0,
                h: isCenter ? H : 0,
                duration: REVEAL,
                ease: EASE.open,
                onUpdate: () => {
                  frame.style.clipPath = clip(p.v, p.h);
                },
              },
              i * REVEAL_STEP,
            );
            tl.fromTo(
              imgs[i],
              { scale: isCenter ? REVEAL_ZOOM + 0.12 : 1.12 },
              { scale: isCenter ? REVEAL_ZOOM : 1, duration: REVEAL + 0.3, ease: EASE.open },
              i * REVEAL_STEP,
            );
          });
          const revealEnd = (frames.length - 1) * REVEAL_STEP + REVEAL;

          /* 2. Fan-out: the center stays; the rest spread into a column, shrinking geometrically. */
          const FAN = 1.15;
          const fanStart = revealEnd - 0.1;
          const spread = [...others].reverse(); // nearest to center first
          spread.forEach((frame, k) => {
            const ring = Math.floor(k / 2);
            const dir = k % 2 === 0 ? -1 : 1;
            tl.to(frame, { y: dir * offsets[ring], scale: scales[ring], duration: FAN, ease: EASE.fan }, fanStart + k * 0.04);
          });
          const loadEnd = fanStart + (spread.length - 1) * 0.04 + FAN;
          tl.addLabel("loaded", loadEnd);

          /* Counter 0 -> 100, finishing exactly as the column settles. */
          const count = { v: 0 };
          tl.to(
            count,
            {
              v: 100,
              duration: loadEnd,
              ease: EASE.tally,
              onUpdate: () => {
                counterEl.textContent = String(Math.round(count.v));
              },
            },
            0,
          );

          /* 3. Complete: counter exits, center frame opens to full screen while the column folds back in. */
          tl.to(counterWrap, { yPercent: -120, autoAlpha: 0, duration: 0.6, ease: "power3.in" }, "loaded-=0.1");
          const OPEN = 1.6;
          const inset = { v: V, h: H };
          tl.to(
            inset,
            {
              v: 0,
              h: 0,
              duration: OPEN,
              ease: EASE.unveil,
              onUpdate: () => {
                last.style.clipPath = clip(inset.v, inset.h);
              },
            },
            "loaded+=0.1",
          );
          tl.to(lastImg, { scale: 1, duration: OPEN + 0.5, ease: EASE.unveil }, "<");
          tl.to(
            spread,
            {
              y: 0,
              scale: (k: number) => scales[Math.floor(k / 2)] * 0.7,
              duration: OPEN * 0.85,
              ease: EASE.unveil,
              stagger: { each: 0.035, from: "end" },
            },
            "<",
          );
          tl.to(overlay, { autoAlpha: 1, duration: 1.2, ease: "power2.out" }, "<0.4");

          /* 4. Hero / Navbar register their tweens at this label (clip-path halfway open). */
          tl.addLabel("reveal", `loaded+=${0.1 + OPEN / 2}`);
        });
      }, el);
    };

    run();

    return () => {
      cancelled = true;
      html.style.overflow = prevOverflow;
      ctx?.revert();
    };
  }, [claim, conduct, center, ratio, fanRatio, fanGap, centerHeight]);

  // Unmount once the intro is done — the Hero beneath is pixel-identical.
  if (status === "done") return null;

  return (
    <div
      ref={root}
      className={`fixed inset-0 z-40 overflow-hidden bg-cream text-ink select-none ${className}`}
      aria-hidden="true"
    >
      {images.map((src, i) => {
        const isCenter = i === center;
        return (
          <div
            key={`${src}-${i}`}
            data-frame
            className={
              isCenter
                ? "absolute inset-0 overflow-hidden will-change-[transform,clip-path]"
                : "absolute top-1/2 left-1/2 overflow-hidden will-change-[transform,clip-path]"
            }
            style={{ clipPath: HIDDEN, zIndex: i + 1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              decoding="async"
              loading="eager"
              fetchPriority={isCenter ? "high" : "auto"}
              className="h-full w-full object-cover will-change-transform"
              style={{ filter: IMAGE_FILTER }}
            />
            <div className="pointer-events-none absolute inset-0 bg-ember/20 mix-blend-multiply" />
            {isCenter && (
              <div
                data-overlay
                className="pointer-events-none absolute inset-0 opacity-0 will-change-[opacity]"
                style={{ background: HERO_GRADIENT }}
              />
            )}
          </div>
        );
      })}

      <div className="absolute bottom-6 left-6 overflow-hidden md:bottom-10 md:left-10">
        <div data-counter-wrap className="flex items-end gap-3 will-change-[transform,opacity]">
          <span data-counter className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.85] font-medium tracking-tighter tabular-nums">
            0
          </span>
          <span className="mb-1 text-[10px] font-medium tracking-[0.22em] text-muted uppercase md:text-[11px]">{label}</span>
        </div>
      </div>
    </div>
  );
}
