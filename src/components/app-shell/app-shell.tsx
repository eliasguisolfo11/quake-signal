import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  active: "monitor" | "history" | "analytics";
  status: "loading" | "ready" | "error";
  receivedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  children: ReactNode;
};

function formatLocalTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AppShell({
  active,
  status,
  receivedAt,
  onRefresh,
  isRefreshing,
  children,
}: AppShellProps) {
  const lastUpdated = formatLocalTime(receivedAt);

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="QuakeSignal, Monitor">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>QuakeSignal</span>
        </Link>

        <nav className="primary-nav" aria-label="Navegación principal">
          <Link href="/" aria-current={active === "monitor" ? "page" : undefined}>
            Monitor
          </Link>
          <Link
            href="/history"
            aria-current={active === "history" ? "page" : undefined}
          >
            Historial
          </Link>
          <Link
            href="/analytics"
            aria-current={active === "analytics" ? "page" : undefined}
          >
            Análisis
          </Link>
        </nav>

        <div className="source-actions">
          <div className={`source-status source-status--${status}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>
              USGS ·{" "}
              {status === "error"
                ? "sin conexión"
                : status === "loading" && !lastUpdated
                  ? "consultando"
                  : lastUpdated
                    ? `actualizado ${lastUpdated}`
                    : "esperando datos"}
            </span>
          </div>
          <button
            className="refresh-button"
            type="button"
            aria-label="Actualizar datos de USGS"
            title="Actualizar datos de USGS"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
              <path
                d="M16.2 8.2A6.4 6.4 0 0 0 5.1 5.7L3.6 7.2M3.6 7.2V3.9m0 3.3H7m-3.2.6a6.4 6.4 0 0 0 11.1 2.5l1.5-1.5m0 0v3.3m0-3.3H13"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
}
