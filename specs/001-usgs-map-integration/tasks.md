# Tareas — Monitor sísmico

## Estado

Aprobadas por el usuario el 2026-10-20. Son tareas de la especificación aprobada en [spec.md](./spec.md) y el plan en [plan.md](./plan.md). Implementación en curso según el orden definido abajo.

## Orden de trabajo

### T-01 — Normalizar el feed GeoJSON de USGS

**Requisitos:** FR-007, FR-008, FR-009, FR-012; AC-01, AC-06, AC-08.

Implementar tipos internos y un adaptador que seleccione los feeds de hora, día y semana, valide la estructura y el generated, normalice los campos del evento y aplique las reglas de omisión de features inválidos.

**Hecho cuando:** un feature válido produce un evento normalizado con ausencias preservadas como null; se omiten eventos sin ID u origen válido; coordenadas incompletas o fuera de rango quedan ausentes; un feed vacío válido se distingue de uno inválido y de uno cuyos eventos son todos inválidos con respuestas fixture/mock reproducibles para cada caso.

### T-02 — Clasificar epicentros por continente

**Requisitos:** FR-003; AC-03.

Incorporar las geometrías continentales con procedencia y licencia documentadas; implementar la clasificación por coordenadas, incluida la separación de Norteamérica y Sudamérica y la falta de continente para puntos fuera de las geometrías.

**Dependencia:** T-01 para el modelo normalizado de coordenadas.

**Hecho cuando:** cada evento con coordenada se clasifica con las opciones acordadas solo si cae dentro de una geometría; sin coordenada, en océano o fuera de límites queda sin continente y aparece solo en Todo el mundo.

### T-03 — Conectar el Route Handler con USGS

**Requisitos:** FR-001, FR-009, FR-011, FR-012; AC-01, AC-02, AC-07, AC-08.

Reemplazar la respuesta provisional 503 de /api/v1/events por consulta sin caché, validación del parámetro de período, normalización y respuesta con generación del feed, recepción y errores recuperables.

**Dependencias:** T-01 y T-02.

**Hecho cuando:** los tres períodos devuelven el contrato común con los eventos válidos y tiempos de fuente/recepción diferenciados; período no válido y fallos de USGS producen errores explícitos, sin datos ficticios.

### T-04 — Implementar carga y actualización de Monitor

**Requisitos:** FR-001, FR-009, FR-010, FR-011; AC-01, AC-02, AC-07, AC-08.

Conectar Monitor a la ruta, iniciar en 24 horas, permitir actualización manual, sondear cada 60 segundos solo cuando la pestaña está visible, refrescar al volver a primer plano y descartar respuestas obsoletas. Actualizar AppShell con fuente, generación del feed, recepción y acción de refresco de la página activa.

**Dependencia:** T-03.

**Hecho cuando:** Monitor y la barra superior identifican USGS y distinguen generación, recepción y origen del evento. Se verifica actualización manual, sondeo a 60 segundos, pausa en segundo plano, actualización inmediata al volver, descarte de respuestas obsoletas, conservación del conjunto durante la carga y restauración del último período correcto tras un fallo.

### T-05 — Completar filtros, lista y detalle sincronizados

**Requisitos:** FR-002, FR-003, FR-004, FR-006, FR-007, FR-008, FR-012, FR-015; AC-03, AC-05, AC-06, AC-08, AC-10.

Implementar umbral decimal de 0,1 con límite inclusivo, filtro continental, conteo y máximo sobre el mismo conjunto, estado sin resultados por filtros, lista ordenada, selección, detalle y navegación por teclado.

**Dependencias:** T-02 y T-04.

**Hecho cuando:** una selección desde la lista actualiza el detalle y puede limpiarse sin perder período ni filtros; cambiar filtros que excluyen el evento cierra su detalle; las horas de origen y actualización muestran zona local y equivalente UTC; los pasos de 0,1 y la inclusión exacta del umbral están comprobados; magnitud ausente y alertas se manejan como especifica el documento; conteo, máximo y lista coinciden.

### T-06 — Implementar el mapa interactivo independiente

**Requisitos:** FR-005, FR-006, FR-014, FR-015, FR-016; AC-04, AC-05, AC-08, AC-10.

Agregar MapLibre GL en cliente, configurar setWorkerUrl para Next.js/Turbopack antes de inicializarlo, usar el estilo Dark de OpenFreeMap e implementar marcadores por magnitud, leyenda compartida, agrupación por zoom, selección sincronizada, atribución y reintento localizado ante fallo.

**Dependencias:** T-01, T-04 y T-05.

**Hecho cuando:** el worker funciona en el build de Next.js; seleccionar un marcador centra el mapa y abre el detalle sincronizado; la leyenda cubre cada magnitud exactamente una vez con los intervalos aprobados; grupos indican cantidad y permiten acercar; la atribución está visible; al fallar el mapa, lista y detalle siguen operables.

### T-07 — Conectar la vista Historial

**Requisitos:** FR-006, FR-007, FR-009, FR-011, FR-013, FR-015; AC-05, AC-08, AC-09, AC-10.

Reemplazar el estado provisional de Historial por el feed de siete días, actualización manual, frescura de la fuente, selección y detalle accesibles; no iniciar sondeo periódico.

**Dependencias:** T-03 y T-05.

**Hecho cuando:** entrar en Historial consulta siete días, ordena los eventos válidos del más reciente al más antiguo y permite actualizar y abrir/cerrar el detalle sin sondeo automático.

### T-08 — Integrar diseño responsive y recorrer aceptación

**Requisitos:** FR-001 a FR-016; AC-01 a AC-10.

Ajustar Monitor e Historial a DESIGN.md, revisar estados de carga/error/vacío, móvil, foco, contraste, controles táctiles y fallos independientes de fuente y mapa. Ejecutar lint, build y el recorrido de aceptación definido en el plan.

**Dependencias:** T-01 a T-07.

**Hecho cuando:** la interfaz funciona sin desplazamiento horizontal en móvil, los controles indicados alcanzan 44×44 px, la lista y selección funcionan con teclado, y se registra el resultado de cada verificación prevista sin declarar como aprobadas las que no se ejecutaron.
