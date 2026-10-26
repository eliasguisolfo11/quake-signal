import type { Metadata } from "next";
import { PortfolioLanding } from "@/features/portfolio/components/portfolio-landing";

export const metadata: Metadata = {
  title: "Explora la actividad sísmica",
  description:
    "Explorá eventos sísmicos, tendencias y contexto geográfico con datos públicos de USGS.",
};

export default function Page() {
  return <PortfolioLanding />;
}
