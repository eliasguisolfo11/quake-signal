# ADR-001: Estructura full-stack de QuakeSignal

## Estado

Aceptada.

## Fecha

2026-10-19

## Contexto

QuakeSignal debe mostrar actividad sísmica pública en un mapa, sincronizar el mapa con el feed y el detalle del evento, permitir filtrar por período, magnitud y región, e indicar la fuente y la frescura de los datos. Estos requisitos están descritos en DESIGN.md.

El repositorio todavía no tiene código de aplicación ni una fuente sísmica elegida. La estructura debe permitir validar y normalizar respuestas externas sin acoplar la interfaz a un proveedor específico. El primer despliegue también debería poder mantenerse como una sola aplicación.

## Decisión

Construir una aplicación full-stack en TypeScript con Next.js App Router. La UI y el endpoint del proyecto viven en la misma aplicación:

- Las páginas de Monitor e Historial usan las convenciones de rutas del App Router.
- Un Route Handler expone una API propia y consulta el proveedor sísmico desde el servidor.
- La integración externa se mantiene detrás de un adaptador para validar, normalizar y cachear los datos.
- El mapa usa MapLibre GL JS dentro de un componente que se ejecuta en el navegador.
- No se agrega base de datos ni worker en la primera etapa. Se incorporarán cuando exista un requisito de persistencia o procesamiento fuera de la petición.

### Estructura propuesta

    QuakeSignal/
    ├── .agents/
    │   └── skills/
    ├── .codex/
    │   └── agents/
    ├── docs/
    │   └── decisions/
    ├── public/
    ├── specs/
    └── src/
        ├── app/
        │   ├── api/
        │   │   └── v1/
        │   │       └── events/
        │   │           └── route.ts
        │   ├── history/
        │   │   └── page.tsx
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── globals.css
        ├── components/
        │   ├── app-shell/
        │   └── ui/
        ├── features/
        │   ├── events/
        │   │   ├── components/
        │   │   ├── data/
        │   │   └── model/
        │   └── map/
        │       ├── components/
        │       └── model/
        ├── lib/
        │   ├── config/
        │   └── time/
        └── server/
            └── seismic/
                ├── providers/
                ├── cache.ts
                ├── normalize.ts
                └── schema.ts

Responsabilidades:

- app/: páginas, layout y límites HTTP. Mantener las páginas delgadas; delegar la lógica a features o server.
- components/ui/: controles visuales reutilizables y coherentes con DESIGN.md.
- features/events/: modelo del evento, filtros, feed, detalle y cliente de la API propia.
- features/map/: render del mapa, marcadores, agrupación y sincronización de selección.
- server/seismic/providers/: adaptadores específicos de la fuente que se elija.
- server/seismic/schema.ts: validación de la respuesta externa en el límite del sistema.
- server/seismic/normalize.ts: conversión de campos del proveedor al modelo de QuakeSignal.
- server/seismic/cache.ts: política de caché basada en límites y frescura reales del proveedor.
- specs/: especificaciones, planes y tareas del flujo SDD.

## Contrato inicial

La UI consulta solamente la API de QuakeSignal, no directamente al proveedor externo.

### Solicitud

GET /api/v1/events

Parámetros iniciales:

- period: 1h, 24h o 7d, de acuerdo con DESIGN.md.
- minMagnitude: magnitud mínima opcional.
- region: filtro opcional; su formato queda pendiente de las capacidades de la fuente elegida.

### Respuesta

La respuesta contiene data, una lista de eventos normalizados, y meta con la fuente y la última actualización exitosa del feed. Cada evento conserva el identificador y enlace oficial cuando estén disponibles, magnitud, ubicación, profundidad nullable, hora de origen en UTC, coordenadas y alerta nullable solo si la fuente la proporciona.

Los errores siguen una forma estable:

    {
      "error": {
        "code": "UPSTREAM_UNAVAILABLE",
        "message": "No se pudo consultar la fuente sísmica."
      }
    }

Validar la forma y los valores de la respuesta externa antes de usarlos. No inferir campos ausentes ni alertas. Diferenciar la hora del evento de la hora de actualización del feed.

## Alternativas consideradas

### Frontend y backend como servicios separados

Da límites de despliegue independientes, pero agrega configuración, comunicación entre servicios y mantenimiento desde el primer día. No hay todavía un requisito que justifique esa separación.

### Consultar al proveedor directamente desde el navegador

Reduce código inicial, pero acopla la UI al formato y disponibilidad de la fuente y dificulta ofrecer una respuesta normalizada con frescura y manejo de errores propios.

### Persistir todos los eventos en una base de datos desde el inicio

Facilitaría consultas históricas propias, pero el proyecto todavía no requiere conservar eventos más allá de lo que ofrezca la fuente. Posponer la base de datos evita una operación adicional hasta que haya un caso concreto.

## Consecuencias

- El proyecto se despliega como una aplicación inicialmente.
- El Route Handler permite mantener una interfaz propia y aislar los cambios del proveedor.
- MapLibre renderiza mapas interactivos con WebGL en el navegador; el proveedor de mosaicos, su disponibilidad, términos y atribución son una decisión aparte.
- La política de refresco y caché se define después de elegir la fuente y revisar sus límites. No se promete tiempo real.
- El contrato de /api/v1/events se termina de fijar con la fuente seleccionada y antes de implementar el endpoint.
- El scaffold inicial usa Next.js 16, React 19 y TypeScript. La dependencia de MapLibre y la implementación del mapa se incorporarán cuando se elija el servicio de mosaicos.

## Referencias

- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/

## Preguntas abiertas

1. Aceptado: Next.js con TypeScript como stack inicial (2026-10-19).
2. Pendiente: ¿qué proveedor de datos sísmicos y de mosaicos usaremos? Deben confirmarse formato, límites, frescura, términos y atribución antes de implementarlos.
3. Pendiente: ¿el primer MVP necesita guardar eventos o preferencias, o alcanza con la consulta a la fuente pública?
