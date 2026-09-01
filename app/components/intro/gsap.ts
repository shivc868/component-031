import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

/* Custom premium eases, registered once and shared by every intro component. */
export const EASE = {
  open: "introOpen", // quick, crisp reveal
  fan: "introFan", // deliberate spread, soft stop
  settle: "introSettle", // long, soft landing (text)
  unveil: "introUnveil", // slow start, decisive open (clip-path)
  tally: "introTally", // counter
} as const;

let ready = false;

/** Registers plugins + eases. Safe to call many times; no-op on the server. */
export function setupGsap() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  gsap.registerPlugin(SplitText, CustomEase);
  CustomEase.create(EASE.open, "M0,0 C0.2,0.8 0.3,1 1,1");
  CustomEase.create(EASE.fan, "M0,0 C0.7,0 0.16,1 1,1");
  CustomEase.create(EASE.settle, "M0,0 C0.14,1 0.34,1 1,1");
  CustomEase.create(EASE.unveil, "M0,0 C0.62,0 0.08,1 1,1");
  CustomEase.create(EASE.tally, "M0,0 C0.32,0 0.18,1 1,1");
}

export { gsap, SplitText };
