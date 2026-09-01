"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, setupGsap } from "./gsap";

/* ------------------------------------------------------------------------- */
/*  IntroProvider                                                             */
/*                                                                            */
/*  One master GSAP timeline for the whole landing intro.                     */
/*  - The Preloader "conducts": it builds the loading sequence and places the */
/*    `reveal` label (the moment the hero should start animating in).         */
/*  - Hero / Navbar "register" builders that add their own tweens at that     */
/*    label. They never need to know how long the preloader takes.            */
/*  - If no Preloader is mounted, the provider runs the builders on its own   */
/*    with `reveal` at 0, so Hero and Navbar still animate in on page load.   */
/* ------------------------------------------------------------------------- */

export type IntroLabels = { reveal: string };
export type IntroBuilder = (tl: gsap.core.Timeline, labels: IntroLabels) => void;
export type IntroStatus = "pending" | "running" | "done";

interface IntroApi {
  status: IntroStatus;
  /** Add tweens to the master timeline. Returns an unregister function. */
  register: (builder: IntroBuilder) => () => void;
  /** Called by the Preloader so the provider doesn't auto-start the intro. */
  claim: () => void;
  /** Called by the conductor once fonts/assets are ready. `setup` builds the
   *  loading part and must add the `reveal` label; builders run afterwards. */
  conduct: (setup: (tl: gsap.core.Timeline) => void) => gsap.core.Timeline;
}

const IntroContext = createContext<IntroApi | null>(null);

export function IntroProvider({ children, onComplete }: { children: ReactNode; onComplete?: () => void }) {
  const [status, setStatus] = useState<IntroStatus>("pending");
  const builders = useRef(new Set<IntroBuilder>());
  const claimed = useRef(false);
  const started = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const register = useCallback((builder: IntroBuilder) => {
    // Late registration (component mounted after the intro ran): play it straight to its end state.
    if (started.current) {
      const tl = gsap.timeline();
      builder(tl, { reveal: "reveal" });
      tl.progress(1);
      return () => tl.kill();
    }
    builders.current.add(builder);
    return () => {
      builders.current.delete(builder);
    };
  }, []);

  const claim = useCallback(() => {
    claimed.current = true;
  }, []);

  const conduct = useCallback((setup: (tl: gsap.core.Timeline) => void) => {
    setupGsap();
    started.current = true;
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        setStatus("done");
        onCompleteRef.current?.();
      },
    });
    tlRef.current = tl;
    setup(tl);
    if (tl.labels.reveal === undefined) tl.addLabel("reveal", 0);
    builders.current.forEach((b) => b(tl, { reveal: "reveal" }));
    setStatus("running");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1);
    else tl.play();
    return tl;
  }, []);

  // Fallback: nobody claimed the intro (no Preloader mounted) -> reveal immediately.
  useEffect(() => {
    if (claimed.current || started.current) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || claimed.current || started.current) return;
      conduct((tl) => tl.addLabel("reveal", 0));
    });
    return () => {
      cancelled = true;
    };
  }, [conduct]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    [],
  );

  const api = useMemo<IntroApi>(() => ({ status, register, claim, conduct }), [status, register, claim, conduct]);
  return <IntroContext.Provider value={api}>{children}</IntroContext.Provider>;
}

/** Safe outside a provider: returns a standalone api that reveals on mount. */
export function useIntro(): IntroApi {
  const ctx = useContext(IntroContext);
  const fallback = useMemo<IntroApi>(
    () => ({
      status: "done",
      register: (builder) => {
        setupGsap();
        const tl = gsap.timeline({ paused: true });
        builder(tl, { reveal: "reveal" });
        if (tl.labels.reveal === undefined) tl.addLabel("reveal", 0);
        document.fonts.ready.then(() => tl.play());
        return () => tl.kill();
      },
      claim: () => {},
      conduct: (setup) => {
        const tl = gsap.timeline();
        setup(tl);
        return tl;
      },
    }),
    [],
  );
  return ctx ?? fallback;
}
