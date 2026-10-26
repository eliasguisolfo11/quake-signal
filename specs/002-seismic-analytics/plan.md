# Plan de implementación — Análisis sísmico

## Estado

Aprobado por el usuario el 2026-10-25. La especificación también está aprobada; la implementación puede avanzar en el orden de tareas definido.

## Alcance

Implementar los requisitos FR-001 a FR-016 y los criterios AC-01 a AC-12 de [spec.md](./spec.md), sobre la aplicación Next.js existente. El alcance de este documento es el análisis histórico verificable y el contexto geográfico/tectónico acordado. No incluye predicción, evaluación de peligro, autenticación ni despliegue.

El trabajo de implementación queda dividido entre los tickets ya creados en el tablero QuakeSignal:

- **T-10:** adaptador USGS, agregaciones históricas y contrato de API; rama **feature/T-10-historical-analytics-api**.
- **T-11:** página Análisis, filtros e indicadores/gráficos; rama **feature/T-11-analytics-page**.
- **T-12:** comparación por país, ficha y contexto tectónico; rama **feature/T-12-seismic-zone-profile**.
- **T-13:** aceptación responsive, teclado, fuentes y estados de datos; rama **feature/T-13-analytics-acceptance**.

Seguir GitFlow: cada ticket se trabaja en su rama feature enlazada, se publica en el remoto y se integra en develop después de completar su validación.

## Base del repositorio

- Next.js 16 con App Router, React 19 y TypeScript 5. La ruta de eventos existente sigue el patrón Route Handler, respuesta JSON sin caché y errores serializables.
- Los modelos y reglas actuales viven en **src/features/events/lib/**. La clasificación continental usa geometrías Natural Earth, pero **continents.json** solo conserva la propiedad del continente; no contiene el nombre o identificador de país necesario para el ranking.
- **event-filters.ts** ya centraliza las bandas de magnitud compartidas con el mapa. Se reutilizarán para evitar intervalos diferentes.
- MapLibre GL ya es una dependencia y se usa en Monitor. No se prevé agregar una biblioteca de gráficos: los gráficos se renderizarán con SVG accesible y componentes React.
- Las pruebas del repositorio usan **node:test** bajo **tests/**; los comandos existentes son **npm test**, **npm run lint** y **npm run build**.
- La navegación está en **src/components/app-shell/app-shell.tsx** y actualmente expone Monitor e Historial.

## Arquitectura y flujo de datos

Flujo: navegador de Análisis → Route Handler → adaptador FDSN → conteo esperado y páginas GeoJSON → validación/normalización → agregaciones puras → asignación geográfica → contrato con procedencia/cobertura → gráficos SVG y mapa/ranking → ficha de país → contexto tectónico.

La ruta histórica obtiene todas las páginas necesarias antes de construir y devolver las métricas. Normalización, deduplicación, series, distribuciones y asignación geográfica se mantienen en módulos de dominio independientes del Route Handler y de la UI. La página coordina filtros, consulta y selección; controles, gráficos, mapa, ranking, ficha y contexto conservan responsabilidades acotadas.

## Decisiones técnicas

### Consulta histórica y límites

- Agregar **GET /api/v1/analytics**. Acepta período (30 días, 12 meses o 5 años), magnitud mínima opcional y continente. La respuesta incluye resultados agregados, filtros solicitados, intervalo exacto UTC, hora de consulta, URL/parámetros de USGS y estado de recuperación.
- Encapsular FDSN Event Web Service en un adaptador de **src/features/analytics/lib/**. Usar el método **count** para la cantidad esperada y **query** en GeoJSON para recuperar los eventos. Mantener fijo un corte UTC por intento; el intervalo de producto es [inicio, corte). Como FDSN interpreta **endtime** de forma inclusiva, enviar como límite superior el milisegundo anterior al corte.
- Recuperar páginas con **limit=20000** y **offset** desde 1, incrementado por los registros de cada página. Validar respuesta HTTP, estructura, identificadores y campos antes de agregar. Deduplicar por ID USGS.
- El servicio documenta **minmagnitude** como “mayor que”, pero FR-003 exige incluir el valor igual al umbral. Para un control en pasos de 0,1, consultar desde un décimo por debajo del valor solicitado y aplicar después el límite inclusivo en la regla local. Para el umbral mínimo, omitir el filtro de magnitud de origen y aplicar la regla local. El conteo esperado y las páginas deben usar los mismos parámetros candidatos; los valores adicionales recuperados se excluyen antes de calcular los indicadores.
- Comparar cantidad esperada con cantidad de IDs recuperados. Ante discrepancia, iniciar una segunda consulta completa con un nuevo corte UTC; si falla una página o persiste la discrepancia, devolver estado de consulta incompleta sin agregados parciales presentados como completos. Tratar como estados separados error de fuente, GeoJSON inválido, catálogo vacío y cero coincidencias tras filtros.
- FDSN no entrega un snapshot transaccional del catálogo. La igualdad entre conteo y registros únicos verifica la recuperación observada, pero no demuestra exhaustividad mundial ni que ningún registro haya cambiado con el mismo conteo. La procedencia debe describir fuente, filtros, corte e intento; no debe prometer consistencia atómica.
- Sin umbral de magnitud, conservar eventos con magnitud ausente en total y grupos geográficos; incluirlos en “Sin dato” en su histograma. Con umbral activo, excluirlos del conjunto filtrado. Para continentes, aplicar la clasificación existente y conservar la opción Todo el mundo.

### Dominio y agregaciones

- Crear tipos de analytics que dependan del modelo interno de evento, no del GeoJSON externo. Compartir el contrato con el Route Handler y mantener los cálculos en funciones puras.
- Construir ventanas UTC en un helper único: 30 días como 30 × 24 horas; 12 meses y 5 años como sustracciones de calendario con ajuste al último día válido del mes. Generar todos los buckets día/mes requeridos, incluidos los de valor cero.
- Calcular total por ID único, máximo y mediana solo con magnitudes disponibles; distribución temporal y los intervalos acordados de magnitud/profundidad. Mantener límites y etiquetas junto a las reglas del dominio. Reutilizar **MAGNITUDE_BANDS** de **event-filters.ts**.
- Comprobar internamente que la suma temporal y la suma de las categorías geográficas coincidan con el total filtrado. Los valores ausentes o fuera de rango permanecen en sus clases separadas y no se imputan.
- El resumen por país incluirá total y serie temporal. Cada perfil incluirá hasta cinco eventos con magnitud más alta y cinco más recientes, sin duplicados, aplicando los desempates de FR-010. Así la ficha se alimenta del mismo conjunto consultado y no lanza una segunda búsqueda potencialmente distinta.

### Países, tierra y mapa

- Incorporar geometrías reducidas y fijadas en **src/features/analytics/data/**: Admin 0 – Countries de Natural Earth 1:110m, versión 5.1.1, y el archivo Land de Natural Earth 1:110m, versión 4.0.0. Guardar en GeoJSON solo las propiedades necesarias; registrar origen, versión, fecha de incorporación y hash del archivo en un README.
- No reutilizar el texto libre de **place** para asignar un país. Primero comprobar si la coordenada cae en tierra; un punto fuera de tierra se clasifica como Oceánico. Para puntos en tierra, un interior único se asigna a ese país; tierra sin país, fronteras/solapamientos y coordenadas ausentes o inválidas se conservan como grupos distintos.
- Extraer o compartir primitivas geométricas de **continents.ts** solo si permite conservar sus resultados actuales. Usar rechazo rápido por cajas envolventes antes de comprobar los polígonos y sus huecos. Una frontera detectada cuenta como coincidencia de borde, no como interior exclusivo. Probar antimeridiano, huecos, bordes, agua y puntos sin coordenadas.
- Dibujar coropleta de conteos observados en MapLibre. El ranking y la ficha de país serán una alternativa completa, operable con teclado y suficiente cuando el mapa no cargue. La selección desde mapa y ranking actualiza la misma ficha.
- La versión de Natural Earth se muestra junto a la metodología. Sus fronteras reflejan el dataset elegido, que no resuelve soberanía y generaliza costas a escala 1:110m.

### Contexto tectónico

- Usar la capa **Plates (ID 1)** del USGS MapServer de límites de placas como procedencia. Incorporar una instantánea GeoJSON reducida de esa capa al repositorio, con fecha de recuperación, atributos conservados, URL de origen y hash documentados. La instantánea permite que el cálculo sea reproducible y no dependa de una segunda llamada de red al abrir cada evento.
- Agregar un adaptador/regla de dominio que, para el evento seleccionado, identifique el límite más cercano y su etiqueta/tipo cuando la geometría lo permita. Si se informa distancia, expresarla como aproximada y en km. El texto debe decir “límite más cercano” cuando solo se haya calculado proximidad; nunca afirmar causalidad. Sin coordenadas, geometría o coincidencia calculable, mostrar el estado de FR-011.
- Atribuir el servicio y la fuente científica indicada por USGS. La fecha/hash de la instantánea es una referencia de versión verificable para la aplicación, no una fecha de origen geológico.

### Interfaz

- Crear **src/app/analytics/page.tsx** y una composición de página de análisis en **src/features/analytics/components/**. Añadir Análisis a la navegación de AppShell sin trasladar lógica de consultas al shell.
- Mantener estado de período, magnitud, continente, país y evento dentro de la experiencia de análisis. Las respuestas antiguas no deben sustituir una consulta más reciente; si un filtro invalida la selección, limpiarla según FR-016.
- Usar gráficos SVG con título, descripción, etiquetas legibles y alternativa de datos/tabular accesible. MapLibre representa el mapa de países; el ranking contiguo debe exponer los mismos conteos y permitir selección por teclado.
- Mostrar fuente, intervalo UTC, filtros, hora de consulta, cobertura y versiones de geometría junto a los resultados. Los estados inicial, carga, error, catálogo vacío, consulta incompleta y cero resultados no ocultan filtros ni procedencia.
- Seguir **DESIGN.md**: superficies oscuras sobrias, mapa y datos como foco, contraste/foco visibles, adaptación móvil sin scroll horizontal y lenguaje limitado a actividad observada/contexto tectónico. No usar alertas, pronósticos o colores que impliquen riesgo.

## Áreas del repositorio

| Área | Cambio previsto | Motivo |
| --- | --- | --- |
| **src/features/analytics/lib/** | Tipos, ventanas, adaptador FDSN, normalización, paginación, agregaciones, clasificación de países y contexto tectónico | Separar reglas y fuentes de los componentes y la ruta |
| **src/features/analytics/data/** | GeoJSON fijado de países, tierra y límites de placas; README de origen/hash | Asignación geográfica y contexto reproducibles |
| **src/app/api/v1/analytics/** | Route Handler de agregados y endpoint/handler de contexto de evento | Validar filtros y publicar estados/procedencia |
| **src/features/analytics/hooks/** | Consulta y estado de filtros/selecciones | Evitar que la página absorba carga y sincronización |
| **src/features/analytics/components/** | Página coordinadora, controles, indicadores, gráficos, mapa, ranking, ficha y contexto | Composición con responsabilidades SOLID |
| **src/components/app-shell/app-shell.tsx** | Entrada de navegación Análisis y tipo de vista activa | Acceso coherente con Monitor e Historial |
| **src/features/events/lib/continents.ts** | Solo si conviene extraer primitivas geométricas compartidas | Evitar duplicar algoritmo sin alterar clasificación existente |
| **src/app/globals.css** | Estilos de Análisis, SVG, tabla, estados y responsive | Seguir la dirección visual y accesibilidad del repo |
| **tests/** | Casos unitarios y de ruta con fixtures/mocks de respuesta USGS y puntos geográficos | Reproducir resultados, paginación y fallos |
| **specs/002-seismic-analytics/acceptance.md** | Registro T-13 por criterio, evidencia y límite de validación | Separar aceptación observable de la compilación |

No se prevé cambiar dependencias. Si el alcance real requiere una nueva biblioteca o un servicio con costo, se evaluará antes de incorporarlo.

## Verificación prevista

Las pruebas unitarias usarán el **node:test** ya configurado y respuestas USGS controladas mediante mocks; no dependerán de que el catálogo real mantenga exactamente los mismos datos. Cubrirán límites UTC, empate inclusivo de magnitud, páginas/offset, deduplicación, diferencias de conteo, reintento único, respuesta incompleta, distribuciones, medianas, categorías geográficas y selección de destacados.

Después de implementar T-10 a T-12 se ejecutarán **npm test**, **npm run lint** y **npm run build**. T-13 recorre AC-01 a AC-12 con el navegador integrado: escritorio y viewport de 375 px, teclado, filtros combinados, enlace de origen, selección por país/evento, respuestas vacías/erróneas/incompletas y consistencia de sumas. La evidencia real, incluidas las limitaciones del proveedor, queda en **acceptance.md**.

## Riesgos y límites

- Consultas de cinco años sin filtro pueden requerir muchas páginas; el límite de USGS es 20.000 resultados por consulta. El estado de carga debe mantenerse y la ruta debe fallar cerrada si no puede completar todas las páginas.
- El catálogo puede cambiar durante una paginación; el control de conteo y un reintento reducen truncamientos detectables, pero no crean un snapshot de proveedor.
- Los límites Natural Earth son generalizados y reflejan su política de representación territorial. Eventos costeros, islas pequeñas, antimeridiano y disputas requieren categoría explícita o prueba determinista.
- La instantánea de placas depende de la geometría y disponibilidad de la capa USGS al incorporarla. Mostrar fuente y fecha/hash permite revisar su vigencia.
- La proximidad a una placa no explica por sí sola el origen del evento; el lenguaje de interfaz debe conservar la limitación de FR-015.
- Si los eventos del catálogo no traen coordenadas o magnitud, las estadísticas que requieren esos campos los separan como ausentes, sin imputarlos.

## Referencias técnicas

- [USGS FDSN Event Web Service](https://earthquake.usgs.gov/fdsnws/event/1/): métodos count/query, GeoJSON, límites y filtros del catálogo.
- [Natural Earth 1:110m Cultural Vectors](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/): países Admin 0 y versión publicada.
- [Natural Earth 1:110m Physical Vectors](https://www.naturalearthdata.com/downloads/110m-physical-vectors/): geometría física de tierra.
- [Términos de uso de Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/): datos vectoriales y raster de dominio público.
- [USGS Tectonic Plate Boundaries MapServer](https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1): capa de líneas de placas y procedencia científica.
- **DESIGN.md**, **specs/001-usgs-map-integration/plan.md** y código actual de **src/features/events/**.
