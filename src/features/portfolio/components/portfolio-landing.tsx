
import Link from "next/link";
import type { ReactNode } from "react";
import { PortfolioMotion } from "./portfolio-motion";
import { ProductPreviewCarousel } from "./product-preview-carousel";

const SOURCES = [
  { label: "USGS · FDSN", href: "https://earthquake.usgs.gov/fdsnws/event/1/" },
  { label: "Natural Earth", href: "https://www.naturalearthdata.com/" },
  { label: "OpenFreeMap", href: "https://openfreemap.org/" },
  { label: "OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
] as const;

function BrandMark() {
  return (
    <span className="portfolio-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function PortfolioNavigation() {
  return (
    <header className="portfolio-nav">
      <Link className="portfolio-brand" href="/" aria-label="QuakeSignal, inicio">
        <BrandMark />
        <span>QuakeSignal</span>
      </Link>

      <nav aria-label="Navegación de portada">
        <Link href="#producto">Producto</Link>
        <Link href="#metodo">Método</Link>
        <Link href="#fuentes">Fuentes</Link>
      </nav>

      <Link className="portfolio-nav-cta" href="/monitor">
        Abrir monitor <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}

function FeatureCard({
  number,
  eyebrow,
  title,
  description,
  className = "",
  children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={"portfolio-feature-card " + className}
      data-reveal
    >
      <div className="portfolio-feature-copy">
        <p className="portfolio-eyebrow">{number} / {eyebrow}</p>
        <h3>{title}</h3>
        <p className="portfolio-feature-description">{description}</p>
      </div>
      <div className="portfolio-feature-art" aria-hidden="true">
        {children}
      </div>
    </article>
  );
}

export function PortfolioLanding() {
  return (
    <PortfolioMotion>
      <div className="portfolio-page">
        <PortfolioNavigation />

        <main>
          <section className="portfolio-hero" aria-labelledby="portfolio-title">
            <div className="portfolio-hero-copy" data-reveal>
              <p className="portfolio-eyebrow portfolio-hero-eyebrow">
                EXPLORADOR SÍSMICO · DATOS ABIERTOS
              </p>
              <h1 id="portfolio-title">Sismos en contexto.</h1>
              <p className="portfolio-hero-description">
                Una forma más clara de explorar dónde ocurren los sismos, cómo se distribuyen
                y qué información pública existe sobre cada zona.
              </p>
              <div className="portfolio-hero-actions">
                <Link className="portfolio-button portfolio-button--primary" href="/monitor">
                  Explorar el monitor <span aria-hidden="true">↗</span>
                </Link>
                <Link className="portfolio-text-link" href="#metodo">
                  Cómo se construye <span aria-hidden="true">↓</span>
                </Link>
              </div>
              <p className="portfolio-hero-note">
                Registros observados del catálogo USGS. Sin predicciones de riesgo.
              </p>
            </div>

            <div className="portfolio-hero-product" id="producto" data-reveal>
              <ProductPreviewCarousel />
            </div>
          </section>

          <section className="portfolio-capabilities" aria-labelledby="capabilities-title">
            <div className="portfolio-section-heading" data-reveal>
              <div>
                <p className="portfolio-eyebrow">UNA LECTURA EN TRES ESCALAS</p>
                <h2 id="capabilities-title">Del evento al territorio.</h2>
              </div>
              <p>
                Cada vista responde una pregunta y conserva el vínculo con la fuente.
              </p>
            </div>

            <div className="portfolio-bento">
              <FeatureCard
                number="01"
                eyebrow="OBSERVAR"
                title="Ubicá cada evento en el mapa."
                description="Los epicentros y sus detalles se consultan junto con el registro de origen, la hora UTC y la profundidad reportada."
                className="portfolio-feature-card--wide"
              >
                <div className="portfolio-coordinate-art">
                  <span className="portfolio-coordinate-ring portfolio-coordinate-ring--outer" />
                  <span className="portfolio-coordinate-ring portfolio-coordinate-ring--middle" />
                  <span className="portfolio-coordinate-ring portfolio-coordinate-ring--inner" />
                  <span className="portfolio-coordinate-cross portfolio-coordinate-cross--horizontal" />
                  <span className="portfolio-coordinate-cross portfolio-coordinate-cross--vertical" />
                  <span className="portfolio-coordinate-point" />
                  <span className="portfolio-coordinate-label">EPICENTRO / REGISTRO</span>
                </div>
              </FeatureCard>

              <FeatureCard
                number="02"
                eyebrow="COMPARAR"
                title="Leé la actividad por período."
                description="Explorá tendencias y distribuciones a partir del catálogo consultado."
                className="portfolio-feature-card--small"
              >
                <div className="portfolio-period-art">
                  <span>30 DÍAS</span>
                  <span>12 MESES</span>
                  <span>5 AÑOS</span>
                </div>
              </FeatureCard>

              <FeatureCard
                number="03"
                eyebrow="CONTEXTUALIZAR"
                title="Entendé la zona y el método."
                description="Los perfiles regionales separan los conteos observados de cualquier lectura de peligro futuro."
                className="portfolio-feature-card--small"
              >
                <div className="portfolio-context-art">
                  <span>CAPAS DE CONTEXTO</span>
                  <div><i>PAÍS</i><i>REGIÓN</i></div>
                  <div><i>TECTÓNICA</i><i>PROFUNDIDAD</i></div>
                </div>
              </FeatureCard>
            </div>
          </section>

          <section className="portfolio-method" id="metodo" aria-labelledby="method-title">
            <div className="portfolio-method-intro" data-reveal>
              <p className="portfolio-eyebrow">TRANSPARENCIA ANTES QUE ESPECTÁCULO</p>
              <h2 id="method-title">Datos públicos, lectura responsable.</h2>
              <p>
                QuakeSignal ordena y contextualiza registros existentes. No emite alertas,
                no estima daños y no predice cuándo ocurrirá un sismo.
              </p>
              <Link className="portfolio-text-link" href="/analytics">
                Ver análisis y metodología <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className="portfolio-method-list" data-reveal>
              <details className="portfolio-method-item" open>
                <summary><span>01</span> Fuente y período</summary>
                <p>
                  El monitor consulta los feeds públicos de USGS. El análisis histórico usa
                  su FDSN Event Web Service y muestra la ventana, los filtros y la recuperación.
                </p>
              </details>
              <details className="portfolio-method-item">
                <summary><span>02</span> Asignación geográfica</summary>
                <p>
                  Los países se asignan intersectando las coordenadas del epicentro con las
                  geometrías Natural Earth. Los registros oceánicos y sin asignación se informan aparte.
                </p>
              </details>
              <details className="portfolio-method-item">
                <summary><span>03</span> Qué significa un conteo</summary>
                <p>
                  Es actividad registrada dentro del período y alcance elegidos. No es una
                  predicción ni una medida del nivel de peligro de una zona.
                </p>
              </details>
            </div>
          </section>

          <section className="portfolio-sources" id="fuentes" aria-labelledby="sources-title" data-reveal>
            <div className="portfolio-sources-heading">
              <p className="portfolio-eyebrow">BASE DOCUMENTAL</p>
              <h2 id="sources-title">Cada capa tiene procedencia.</h2>
            </div>

            <div className="portfolio-source-marquee" aria-hidden="true">
              <div className="portfolio-source-track">
                <span>USGS · FDSN EVENT WEB SERVICE</span>
                <span>NATURAL EARTH</span>
                <span>OPENFREEMAP</span>
                <span>OPENMAPTILES</span>
                <span>OPENSTREETMAP CONTRIBUTORS</span>
                <span>USGS · FDSN EVENT WEB SERVICE</span>
                <span>NATURAL EARTH</span>
                <span>OPENFREEMAP</span>
                <span>OPENMAPTILES</span>
                <span>OPENSTREETMAP CONTRIBUTORS</span>
              </div>
            </div>

            <ul className="portfolio-source-links">
              {SOURCES.map((source) => (
                <li key={source.label}>
                  <a href={source.href} target="_blank" rel="noreferrer">
                    {source.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
              <li><span>OpenMapTiles · atribución en el mapa</span></li>
            </ul>
          </section>

          <section className="portfolio-final-cta" data-reveal>
            <div>
              <p className="portfolio-eyebrow">QUAKESIGNAL / EXPLORACIÓN</p>
              <h2>Seguí la señal desde la fuente.</h2>
              <p>Consultá eventos, filtrá períodos y explorá el contexto geográfico.</p>
            </div>
            <Link className="portfolio-button portfolio-button--primary" href="/monitor">
              Abrir QuakeSignal <span aria-hidden="true">↗</span>
            </Link>
          </section>
        </main>

        <footer className="portfolio-footer">
          <Link className="portfolio-brand" href="/" aria-label="QuakeSignal, inicio">
            <BrandMark />
            <span>QuakeSignal</span>
          </Link>
          <p>Exploración de actividad sísmica con fuentes públicas verificables.</p>
          <Link href="/analytics">Ver análisis <span aria-hidden="true">↗</span></Link>
        </footer>
      </div>
    </PortfolioMotion>
  );
}
