# Tareas — Análisis sísmico

## Estado

Aprobadas por el usuario el 2026-10-25. Derivadas de la especificación y el plan aprobados; implementar en el orden indicado.

## Orden de trabajo

### T-10.1 — Consultar el catálogo histórico completo

**Requisitos:** FR-002, FR-003, FR-013, FR-014.
**Criterios:** AC-02, AC-10.
**Áreas:** adaptador FDSN en **src/features/analytics/lib/** y pruebas en **tests/**.

Implementar la construcción de intervalos UTC, consulta de conteo y paginación GeoJSON con offset. Fijar el corte por intento, traducir el intervalo semiabierto al límite inclusivo de FDSN y preservar el umbral inclusivo de 0,1 mediante filtrado local del conjunto candidato.

**Hecho cuando:** los tests con fetch controlado verifican límites UTC, parámetros, página límite de 20.000, offsets consecutivos, magnitudes en el valor exacto del umbral, IDs duplicados, un reintento con nuevo corte y error incompleto si la segunda recuperación no coincide o falla.

### T-10.2 — Calcular indicadores y distribuciones reproducibles

**Dependencias:** T-10.1.
**Requisitos:** FR-005, FR-006, FR-007, FR-008.
**Criterios:** AC-02, AC-03, AC-05.
**Áreas:** agregadores de **src/features/analytics/lib/** y pruebas en **tests/**.

Implementar deduplicación por ID, total, máximo, mediana, series UTC con buckets cero y distribuciones con los límites definidos en la especificación. Reutilizar las bandas de magnitud existentes; separar profundidades sin dato o fuera de clase.

**Hecho cuando:** casos fixture reproducen todos los límites de magnitud/profundidad, los valores ausentes no se convierten en cero, la mediana ignora solo magnitudes ausentes y la suma de buckets temporales coincide con el total filtrado.

### T-10.3 — Asignar eventos y agregados a países

**Dependencias:** T-10.1.
**Requisitos:** FR-004, FR-009, FR-010, FR-012.
**Criterios:** AC-04, AC-06, AC-07, AC-11.
**Áreas:** **src/features/analytics/data/** y reglas geográficas/agregación por país.

Añadir países y tierra Natural Earth versionados y documentados; asignar puntos por geometría, no por el texto de ubicación. Separar países, Oceánico, Tierra sin país asignado, Sin asignar por frontera/solapamiento y Sin coordenadas. Calcular series y destacados deterministas por país.

**Hecho cuando:** fixtures de interior, agua, tierra no asignada, frontera, hueco, antimeridiano y coordenada inválida producen la categoría esperada; el ranking más grupos no asignados suma el total; los perfiles nunca repiten eventos y cumplen los desempates de FR-010.

### T-10.4 — Exponer API de análisis con procedencia y estados

**Dependencias:** T-10.1, T-10.2 y T-10.3.
**Requisitos:** FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-012, FR-013, FR-014.
**Criterios:** AC-02 a AC-07, AC-10, AC-11.
**Área:** **src/app/api/v1/analytics/route.ts** y tests de ruta.

Validar filtros en el servidor y devolver una respuesta agregada tipada con intervalo, filtros, fuente/consulta, hora de recuperación, datos geográficos y cobertura. No enviar agregados parciales como completos ni confundir catálogo vacío con filtros sin coincidencias.

**Hecho cuando:** tests de ruta comprueban contrato y valores de procedencia, parámetros inválidos, fuente inaccesible, GeoJSON inválido, catálogo vacío, cero por filtros, consulta completa, reintento e incompleta sin resumen engañoso.

### T-11.1 — Crear navegación, filtros y consulta de Análisis

**Dependencias:** T-10.4.
**Requisitos:** FR-001, FR-002, FR-003, FR-004, FR-012, FR-014, FR-016.
**Criterios:** AC-01, AC-02, AC-09, AC-11.
**Áreas:** **src/app/analytics/page.tsx**, AppShell, hook y controles de analytics.

Agregar Análisis a la navegación y crear la página coordinadora con período inicial de 30 días, magnitud opcional, continente, consulta, estado de carga y procedencia. Conservar período/filtros al cerrar el perfil y descartar respuestas antiguas.

**Hecho cuando:** navegar abre Análisis desde el shell; controles accesibles disparan los parámetros correctos; filtros y fuente permanecen disponibles durante carga/error/vacío; el estado anterior no es reemplazado por una respuesta obsoleta.

### T-11.2 — Mostrar indicadores y gráficos accesibles

**Dependencias:** T-11.1.
**Requisitos:** FR-005, FR-006, FR-007, FR-008, FR-012, FR-015.
**Criterios:** AC-02, AC-03, AC-05, AC-11, AC-12.
**Áreas:** componentes SVG/React y estilos de **src/app/globals.css**.

Presentar conteo, máximo, mediana, actividad temporal, magnitud y profundidad con los datos del mismo contrato y filtros. Acompañar el gráfico con títulos, unidades, leyenda y alternativa legible/tabular; diferenciar magnitud observada de peligro.

**Hecho cuando:** render de fixtures concuerda con la API y las sumas; todos los intervalos y categorías ausentes están identificados; los gráficos se entienden con teclado/lector de pantalla y no emplean lenguaje predictivo.

### T-12.1 — Mostrar mapa y ranking interactivo por país

**Dependencias:** T-10.4 y T-11.1.
**Requisitos:** FR-009, FR-012, FR-014, FR-016.
**Criterios:** AC-04, AC-06, AC-09, AC-11, AC-12.
**Áreas:** componente MapLibre, ranking, datos geográficos y estilos.

Renderizar una coropleta de eventos observados y un ranking con los mismos conteos. Permitir seleccionar un país desde el mapa o desde la lista; la alternativa listada debe seguir disponible si el mapa falla.

**Hecho cuando:** selección de ambos controles abre el mismo país y conteo; grupos sin asignar permanecen separados; la versión de geometrías se ve; ranking y selección son utilizables por teclado sin depender del color.

### T-12.2 — Completar ficha de país y contexto tectónico

**Dependencias:** T-10.3, T-10.4 y T-12.1.
**Requisitos:** FR-010, FR-011, FR-012, FR-015, FR-016.
**Criterios:** AC-07, AC-08, AC-09, AC-11, AC-12.
**Áreas:** ficha de país, detalle de evento, snapshot USGS de placas y pruebas de dominio.

Mostrar período/filtros, total, tendencia, destacados y detalle del evento seleccionado. Incorporar la capa USGS de placas con fuente, fecha/hash, categoría del límite y proximidad etiquetada como tal, sin establecer causalidad.

**Hecho cuando:** se muestran hasta cinco eventos más fuertes y cinco más recientes sin duplicados; los eventos navegan a USGS; el límite más cercano se distingue de una causa; falta de coordenadas/datos produce el estado especificado y volver conserva filtros.

### T-13 — Validar aceptación completa y documentar evidencia

**Dependencias:** T-11.2 y T-12.2.
**Requisitos:** FR-001 a FR-016 y requisitos no funcionales de teclado, contraste, responsive y consistencia de datos.
**Criterios:** AC-01 a AC-12.
**Área:** **specs/002-seismic-analytics/acceptance.md**.

Ejecutar las pruebas declaradas por el proyecto, lint y build; recorrer la experiencia en el navegador integrado en escritorio y móvil, con teclado, datos reales verificables y estados controlados. Registrar cada criterio, evidencia y límite sin extrapolar disponibilidad del proveedor.

**Hecho cuando:** AC-01 a AC-12 tienen resultado y evidencia; filtros, indicadores, series y grupos coinciden; error, vacío e incompleto son distintos; navegación por teclado y layout móvil no requieren scroll horizontal; **npm test**, **npm run lint** y **npm run build** quedan registrados con su resultado real.

## Dependencias resumidas

T-10.1 → T-10.2 y T-10.3 → T-10.4 → T-11.1 → T-11.2 → T-12.1 → T-12.2 → T-13.
