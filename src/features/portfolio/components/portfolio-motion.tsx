"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type PortfolioMotionProps = {
  children: ReactNode;
};

export function PortfolioMotion({ children }: PortfolioMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const revealItems = root.querySelectorAll<HTMLElement>("[data-reveal]");

      revealItems.forEach((item) => {
        gsap.fromTo(
          item,
          { autoAlpha: 0.9, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top 88%",
              once: true,
            },
          },
        );
      });

      const previewImage = root.querySelector<HTMLElement>(
        ".portfolio-preview-card--active .portfolio-preview-image",
      );
      if (previewImage) {
        gsap.fromTo(
          previewImage,
          { autoAlpha: 0.9, scale: 0.98 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.65,
            ease: "power2.out",
            scrollTrigger: {
              trigger: previewImage,
              start: "top 90%",
              once: true,
            },
          },
        );
      }

      const stack = root.querySelector<HTMLElement>(".portfolio-preview-stage");
      const stackCards = root.querySelectorAll<HTMLElement>("[data-stack-card]");
      if (stack && stackCards.length > 0) {
        gsap.fromTo(
          stackCards,
          { y: 28, rotation: 1.25 },
          {
            y: 0,
            rotation: 0,
            duration: 0.65,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: stack,
              start: "top 84%",
              once: true,
            },
          },
        );
      }
    });

    return () => media.revert();
  }, []);

  return (
    <div className="portfolio-motion" ref={rootRef}>
      {children}
    </div>
  );
}
