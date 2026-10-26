"use client";

import Image from "next/image";
import { useState } from "react";

const PRODUCT_VIEWS = [
  {
    label: "Monitor",
    image: "/images/portfolio/monitor-preview.png",
    alt: "Monitor de QuakeSignal con mapa mundial de epicentros y lista de eventos recientes",
  },
  {
    label: "Historial",
    image: "/images/portfolio/history-preview.png",
    alt: "Historial de eventos sísmicos con filtros por magnitud y continente",
  },
  {
    label: "Análisis",
    image: "/images/portfolio/analytics-preview.png",
    alt: "Análisis de actividad sísmica con mapa por países y ranking observado",
  },
] as const;

export function ProductPreviewCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeView = PRODUCT_VIEWS[activeIndex];

  return (
    <div className="portfolio-preview-carousel" role="group" aria-label="Vistas del producto">
      <div className="portfolio-preview-stage">
        {PRODUCT_VIEWS.map((view, index) => {
          const stackOrder = (index - activeIndex + PRODUCT_VIEWS.length) % PRODUCT_VIEWS.length;
          const isActive = stackOrder === 0;

          return (
            <figure
              key={view.label}
              className={
                "portfolio-preview-card portfolio-preview-card--stack-" +
                stackOrder +
                (isActive ? " portfolio-preview-card--active" : "")
              }
              data-stack-card
              aria-hidden={!isActive}
              inert={!isActive}
            >
              <Image
                className="portfolio-preview-image"
                src={view.image}
                alt={isActive ? view.alt : ""}
                fill
                sizes="(max-width: 900px) 100vw, 58vw"
                quality={75}
                preload={index === 0}
              />
            </figure>
          );
        })}
        <span className="portfolio-preview-stamp" aria-hidden="true">
          QuakeSignal / Producto
        </span>
      </div>

      <div className="portfolio-preview-controls">
        <div className="portfolio-preview-copy" aria-live="polite" aria-atomic="true">
          <span className="portfolio-eyebrow">VISTA DEL PRODUCTO</span>
          <strong>{activeView.label}</strong>
        </div>

        <div className="portfolio-preview-switcher" role="group" aria-label="Elegir vista de producto">
          {PRODUCT_VIEWS.map((view, index) => (
            <button
              key={view.label}
              className={
                "portfolio-preview-tab" +
                (index === activeIndex ? " portfolio-preview-tab--active" : "")
              }
              type="button"
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
      <p className="portfolio-preview-note">
        Capturas de interfaz. Al abrir cada vista, QuakeSignal consulta sus fuentes públicas.
      </p>
    </div>
  );
}
