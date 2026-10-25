import { Suspense } from "react";
import { AnalyticsPage } from "@/features/analytics/components/analytics-page";

function AnalyticsFallback() {
  return (
    <main className="main-content">
      <section className="analytics-loading" aria-label="Cargando análisis" aria-busy="true">
        <div className="analytics-loading-summary"><span /><span /><span /></div>
        <div className="analytics-loading-panels"><span /><span /></div>
      </section>
    </main>
  );
}

export default function AnalyticsRoute() {
  return (
    <Suspense fallback={<AnalyticsFallback />}>
      <AnalyticsPage />
    </Suspense>
  );
}
