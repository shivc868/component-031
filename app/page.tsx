import { Hero, IntroProvider, Navbar, Preloader } from "./components/intro";

const HERO_IMAGE = "/images/hero.jpg";

/* Warm-toned imagery for the preloader. The last one must be the hero image. */
const PRELOADER_IMAGES = [
  "/images/warm-01.jpg",
  "/images/warm-02.jpg",
  "/images/warm-03.jpg",
  "/images/warm-04.jpg",
  "/images/warm-05.jpg",
  "/images/warm-06.jpg",
  HERO_IMAGE,
];

export default function Home() {
  return (
    <IntroProvider>
      <Navbar />
      <Preloader images={PRELOADER_IMAGES} />
      <Hero
        image={HERO_IMAGE}
        title="Warm light, made to linger."
        subtitle="We craft spaces, objects and images that hold the last hour of the day a little longer."
      />
    </IntroProvider>
  );
}
