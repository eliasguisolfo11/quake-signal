import { classifyContinent } from "@/features/events/lib/continents";
import { EVENT_PERIODS, type EventPeriod } from "@/features/events/lib/types";
import { getUsgsFeedUrl, parseUsgsFeed, UsgsFeedError } from "@/features/events/lib/usgs-feed";

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const requestedPeriod = searchParams.get("period") ?? "day";

  if (!EVENT_PERIODS.includes(requestedPeriod as EventPeriod)) {
    return errorResponse(400, "INVALID_PERIOD", "Elegí hora, día o semana para consultar los eventos.");
  }

  const period = requestedPeriod as EventPeriod;
  const sourceUrl = getUsgsFeedUrl(period);

  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: { Accept: "application/geo+json, application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return errorResponse(
        502,
        "SOURCE_UNAVAILABLE",
        "USGS no pudo completar la consulta. Podés intentarlo de nuevo.",
      );
    }

    const receivedAt = new Date().toISOString();
    const feed = parseUsgsFeed(await response.json());
    const events = feed.events.map((event) => ({
      ...event,
      continent: classifyContinent(event.coordinates),
    }));

    return Response.json(
      {
        source: "USGS",
        sourceUrl,
        period,
        generatedAt: feed.generatedAt,
        receivedAt,
        events,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof UsgsFeedError) {
      return errorResponse(
        502,
        "INVALID_SOURCE_FEED",
        "USGS devolvió datos que no se pudieron validar. Podés intentarlo de nuevo.",
      );
    }

    return errorResponse(
      502,
      "SOURCE_UNAVAILABLE",
      "No se pudo consultar USGS. Revisá la conexión e intentá de nuevo.",
    );
  }
}
