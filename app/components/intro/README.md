# Intro — Preloader · Hero · Navbar

A drop-in landing intro for Next.js (App Router) built on one GSAP timeline.

```
gsap.ts            plugins + custom eases, registered once
IntroProvider.tsx  master timeline; Preloader conducts, Hero/Navbar register at the `reveal` label
Preloader.tsx      image stack -> fan-out column -> centre image opens to full screen (unmounts when done)
Hero.tsx           background + SplitText masked headline reveal
Navbar.tsx         fixed transparent header with logo, links and CTA pill
```

## Install

```bash
npm i gsap            # 3.13+ (SplitText + CustomEase are free)
```

Copy the `intro/` folder into your project and add the theme tokens to your Tailwind v4 CSS:

```css
@theme inline {
  --color-cream: #f3ebe0;
  --color-ink:   #1c1613;
  --color-ember: #b4532a;
  --color-muted: #8f7d70;
  --color-paper: #f8f1e7;
}
```

Load Inter (or your brand font) in `app/layout.tsx` via `next/font/google` and set it as the body font.

## Use

```tsx
import { Hero, IntroProvider, Navbar, Preloader } from "@/components/intro";

const HERO_IMAGE = "/images/hero.jpg";

export default function Page() {
  return (
    <IntroProvider onComplete={() => console.log("intro done")}>
      <Navbar
        brand="Solene"
        links={[{ label: "Why Us", href: "#why" }, { label: "Contact", href: "#contact" }]}
        cta={{ label: "Join waitlist", href: "#join" }}
      />
      <Preloader images={[...sixWarmImages, HERO_IMAGE]} />
      <Hero image={HERO_IMAGE} title="Warm light, made to linger." subtitle="…" />
      {/* rest of the page */}
    </IntroProvider>
  );
}
```

- The **last** Preloader image must equal the Hero `image` — the preloader's centre frame opens to
  full screen and is then unmounted, revealing the identical Hero background underneath.
- Use an odd number of images (7 recommended): 1 centre + equal rings above and below.
- `Hero` and `Navbar` work without a `Preloader` (or without the provider): they animate in on mount.
- Respects `prefers-reduced-motion` (jumps straight to the final state).

## Tuning

| Prop (Preloader) | Default | Effect |
| --- | --- | --- |
| `ratio` | `3/2` | frame aspect ratio |
| `fanRatio` | `0.68` | each ring is this × its inner neighbour |
| `fanGap` | `0.12` | gap before each frame, fraction of its own height |
| `centerHeight` | `0.24` | centre frame height cap (× viewport height) |

Timings live at the top of each phase in `Preloader.tsx`; eases in `gsap.ts`.
