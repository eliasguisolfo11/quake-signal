export function formatUtc(value: string | null): string {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return (
    new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

export function formatLocal(value: string | null): string {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatLocalWithZone(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatRelative(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);

  if (minutes < 1) return "hace menos de 1 min";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  return `hace ${Math.floor(hours / 24)} d`;
}

export function formatMagnitude(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function describeEventSummary(
  count: number,
  maxMagnitude: number | null,
): string {
  const magnitudeText =
    maxMagnitude === null
      ? "magnitud máxima no disponible"
      : `magnitud máxima ${formatMagnitude(maxMagnitude)}`;

  return `${count} ${count === 1 ? "evento" : "eventos"} · ${magnitudeText}`;
}
