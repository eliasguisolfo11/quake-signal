# QuakeSignal: monitor con datos sísmicos públicos

## Estado

Aprobada por el usuario el 2026-10-20.

## Contexto

QuakeSignal ya tiene las páginas Monitor e Historial, pero todavía no muestra eventos ni un mapa. Se eligieron los feeds GeoJSON públicos de USGS como primera fuente sísmica y el estilo Dark de OpenFreeMap para el mapa. USGS documenta feeds para la última hora, el último día y los últimos siete días, con actualización del feed cada minuto. La aplicación debe informar la frescura real del feed y no presentarla como una garantía de tiempo real.

La experiencia debe respetar [DESIGN.md](../../DESIGN.md): mapa y feed sincronizados, detalles verificables, filtros comprensibles, atribución visible, y estados que nunca inventan datos ni inferencias de seguridad.

## Usuarios

Personas que quieren explorar actividad sísmica reciente en el mundo desde una interfaz visual y consultar qué datos reportó la fuente oficial.

## Historias de usuario

- **US-01:** Como visitante, quiero ver eventos sísmicos recientes en un mapa y una lista para entender dónde ocurrieron y qué magnitud reportó la fuente.
- **US-02:** Como visitante, quiero limitar los resultados por período, magnitud mínima y continente para concentrarme en los eventos que me interesan.
- **US-03:** Como visitante, quiero seleccionar un evento desde el mapa o la lista y consultar su información de origen para verificarla en la fuente.
- **US-04:** Como visitante, quiero conocer cuándo se generaron los datos y cuándo se actualizaron para evaluar su frescura.

## Requisitos funcionales

- **FR-001 — Período:** Al abrir Monitor, se muestran los eventos de las últimas 24 horas. El usuario puede elegir última hora, últimas 24 horas o últimos 7 días. La elección actual se identifica con su etiqueta.
- **FR-002 — Magnitud mínima:** El usuario puede establecer un umbral numérico mínimo en pasos de 0,1, sin límite fijo superior o inferior, o dejarlo sin filtro. Se incluyen eventos con magnitud igual o mayor al umbral; cuando no hay umbral, también se conservan eventos cuya magnitud no esté disponible. Con un umbral activo, los eventos sin magnitud se excluyen. El valor activo se muestra como número, sin convertirlo en una categoría de peligro.
- **FR-003 — Continente:** El usuario puede elegir Todo el mundo o filtrar por Norteamérica, Sudamérica, África, Asia, Europa, Oceanía o Antártida. La asignación se determina por las coordenadas del epicentro y los límites geográficos continentales, nunca por una búsqueda de texto en el nombre del lugar.
- **FR-004 — Resultados sincronizados:** Conteo, resumen, lista y marcadores se calculan sobre el mismo período y los mismos filtros. El resumen de magnitud indica la mayor magnitud disponible entre los resultados filtrados; si ninguno tiene magnitud disponible, lo expresa. Los eventos se ordenan por hora de origen, del más reciente al más antiguo.
- **FR-005 — Mapa:** Monitor representa en el mapa los eventos con coordenadas válidas. El tamaño de los marcadores escala con la magnitud y el color usa estos intervalos fijos: m < 2,0; 2,0 ≤ m < 3,0; 3,0 ≤ m < 4,0; 4,0 ≤ m < 5,0; 5,0 ≤ m < 6,0; 6,0 ≤ m < 7,0; y m ≥ 7,0. Los rangos solo describen magnitud, no peligro. Una magnitud ausente usa un marcador neutral. Al alejar el mapa, los eventos cercanos se agrupan y el grupo indica su cantidad. Al seleccionarlo, el mapa se acerca a la extensión del grupo para exponer sus eventos individuales cuando el nivel de zoom permite separarlos.
- **FR-006 — Selección:** Seleccionar una fila o un marcador identifica el mismo evento en ambas regiones, centra el mapa en su epicentro y presenta su detalle. El detalle permite regresar a la lista sin perder período ni filtros. Cuando los resultados del período o los filtros aplicados no contienen el evento seleccionado, se limpia la selección y se cierra su detalle.
- **FR-007 — Evidencia del evento:** Cuando la fuente los proporcione, el detalle muestra magnitud, ubicación reportada, profundidad en kilómetros, hora de origen y actualización en la zona local del visitante con su equivalente UTC explícito, coordenadas y enlace al registro oficial. Un valor ausente se representa como no disponible, nunca como cero.
- **FR-008 — Alertas:** La interfaz muestra una alerta solamente cuando USGS la incluye para ese evento. No infiere alertas, impacto local ni seguridad a partir de la magnitud.
- **FR-009 — Fuente y frescura:** La interfaz identifica a USGS y muestra la hora de generación del feed por separado de la hora de origen de cada evento. Se ofrece una acción para actualizar. Mientras Monitor está visible, consulta el feed del período seleccionado cada 60 segundos; suspende la consulta periódica cuando la pestaña está en segundo plano y consulta de inmediato al volver a primer plano. Esto comunica un intervalo de consulta, no garantiza que la fuente haya publicado datos nuevos.
- **FR-010 — Actualización en curso:** Mientras se consulta, la interfaz conserva y señala el último conjunto completo de resultados, junto con su período, filtros y hora de recepción. Respuestas de consultas anteriores no reemplazan resultados de una selección de período o filtros más reciente.
- **FR-011 — Errores y reintento:** Si la fuente falla, se mantiene el último conjunto válido de la sesión con el período y los filtros que produjo esos resultados, se indica cuándo se recibió y se ofrece reintentar. Si falla una consulta tras cambiar el período, el selector vuelve al último período cargado correctamente. Si todavía no hay una respuesta válida, el error se muestra dentro de la región afectada y no se reemplaza con datos de ejemplo.
- **FR-012 — Sin resultados y datos inválidos:** Un feed vacío válido muestra el estado sin eventos. Si los filtros dejan cero eventos, se nombran los filtros activos y se ofrece limpiarlos. Un feed se considera válido si tiene la estructura GeoJSON esperada, un momento de generación interpretable y una colección de eventos. Se omiten eventos individuales sin identificador o con hora de origen inválida; coordenadas incompletas o fuera de rango se tratan como ausentes. Si el feed no tiene estructura o metadatos de generación válidos, o si todos sus eventos son inválidos, se muestra un error recuperable y no un estado vacío. Los valores inválidos nunca se convierten en cero.
- **FR-013 — Historial:** Al entrar en la página Historial, se consulta el feed de los últimos siete días y se muestran sus eventos válidos en orden descendente, con acceso al detalle y la misma identificación de fuente y frescura. El usuario puede actualizar manualmente; Historial no sondea automáticamente.
- **FR-014 — Atribución del mapa:** El mapa mantiene visible la atribución requerida para el estilo y los datos cartográficos usados.
- **FR-015 — Accesibilidad:** La lista permite navegar y seleccionar eventos con teclado y es una alternativa completa a localizar eventos únicamente en el mapa. El estado seleccionado se comunica con texto o forma además del color. Los controles tienen nombre accesible, foco visible y áreas táctiles mínimas de 44×44 px en móvil.
- **FR-016 — Fallo independiente del mapa:** Si los datos sísmicos están disponibles pero el mapa no carga, la lista y el detalle siguen operables; el área del mapa comunica el problema y permite reintentar el mapa sin reemplazar el contenido sísmico por un error de página completa.

## Requisitos no funcionales y confianza

- La interfaz nunca describe el feed como “en tiempo real” ni implica que USGS garantice un plazo de actualización.
- Los datos y enlaces deben poder atribuirse a USGS; los mosaicos mantienen su atribución cartográfica visible.
- Período, magnitud, hora del evento y frescura del feed usan etiquetas y unidades explícitas.
- El monitor mantiene la estructura del mapa y el feed en escritorio y se adapta a tablet y móvil sin desplazamiento horizontal.
- El servicio de mapa elegido no ofrece SLA. La integración debe poder sustituirse si las condiciones de disponibilidad o uso cambian.

## Casos límite

- Un evento sin coordenadas válidas puede aparecer en Todo el mundo si sus otros datos permiten mostrarlo, pero no tiene marcador ni puede clasificarse en un continente; por eso se excluye de cualquier filtro continental. Un epicentro válido que no pertenezca a ningún límite continental definido también aparece solo en Todo el mundo.
- Un evento sin ubicación, profundidad, alerta, magnitud o enlace oficial no recibe valores inferidos; el dato faltante se representa como no disponible y el enlace se omite. Si hay un umbral de magnitud activo, los eventos sin magnitud se excluyen del resultado.
- Si un continente seleccionado no tiene eventos en el período, se presenta el estado sin resultados por filtros y una acción para limpiar los filtros.
- Si no hay datos previos y falla la consulta, se muestra un error recuperable. Si ya había resultados en la sesión, se conservan con su período, filtros y hora de recepción; si falló un cambio de período, el selector vuelve al último período cargado correctamente.
- Si cambia el período o un filtro mientras hay una consulta pendiente, una respuesta anterior no sustituye la vista correspondiente a la selección más reciente ni mezcla sus detalles con los resultados nuevos.
- Si solo algunos eventos del feed son inválidos, se muestran los demás y se omiten los inválidos. Un feed vacío válido es distinto de un feed con estructura/metadatos inválidos o cuyos eventos son todos inválidos; estos últimos producen un error recuperable.
- Si falla el mapa pero el feed es válido, se mantienen la lista, selección y detalle disponibles y se comunica el fallo solo en el espacio del mapa.

## Fuera de alcance

- Cuentas, almacenamiento de preferencias, base de datos propia o descarga sin conexión.
- Notificaciones push, alertas propias o garantía de entrega inmediata.
- Búsqueda histórica más allá de los últimos siete días o paginación avanzada.
- Fuentes sísmicas adicionales y capas cartográficas adicionales.
- Interpretar magnitud como daño, peligro local o recomendación de seguridad.

## Criterios de aceptación

- **AC-01 (FR-001, FR-009):** Al entrar en Monitor, la fuente se identifica como USGS, el período inicial es 24 horas y la hora de generación del feed se distingue de la hora de cada evento.
- **AC-02 (FR-001, FR-004):** Cambiar entre 1 hora, 24 horas y 7 días actualiza el resumen, la lista y los marcadores usando el mismo período.
- **AC-03 (FR-002, FR-003, FR-004):** Al combinar un umbral numérico de magnitud y un continente, mapa, lista y conteo contienen exactamente los eventos del período elegido que cumplen ambos filtros. Un evento cuya magnitud es igual al umbral está incluido; uno menor queda fuera. El resumen muestra la magnitud máxima disponible en ese conjunto; si no hay magnitudes disponibles, lo indica. Los eventos sin magnitud quedan fuera cuando el umbral está activo; limpiar filtros devuelve Todo el mundo y quita el umbral.
- **AC-04 (FR-005, FR-014):** El mapa muestra ubicaciones válidas; los eventos sin magnitud usan marcador neutral; los grupos muestran su cantidad y al seleccionarlos el mapa se acerca a su área. La leyenda muestra exactamente estos intervalos: m < 2,0; 2,0 ≤ m < 3,0; 3,0 ≤ m < 4,0; 4,0 ≤ m < 5,0; 5,0 ≤ m < 6,0; 6,0 ≤ m < 7,0; y m ≥ 7,0; toda magnitud válida pertenece a un único intervalo. La atribución cartográfica permanece visible.
- **AC-05 (FR-006, FR-007, FR-015):** Elegir un evento desde teclado, lista o mapa sincroniza la selección y permite consultar los datos disponibles, la hora local con zona explícita, su equivalente UTC y el enlace oficial. Si el resultado de un nuevo período o filtro excluye el evento, su selección y detalle se limpian.
- **AC-06 (FR-008):** Una alerta aparece solamente cuando está presente en los datos del evento; la magnitud nunca genera texto de peligro o seguridad.
- **AC-07 (FR-009, FR-010):** Con Monitor visible, se consulta cada 60 segundos; en segundo plano se suspenden consultas periódicas y al volver a primer plano se consulta de inmediato. La actualización manual está disponible. Durante una consulta se conserva el último conjunto completo con su etiqueta de período/filtros. Una respuesta antigua no reemplaza la selección más reciente.
- **AC-08 (FR-011, FR-012, FR-016):** Carga, error recuperable, feed válido sin eventos y filtros sin resultados son distinguibles. Un evento sin identificador o con hora inválida se omite; coordenadas incompletas o fuera de rango se tratan como ausentes; un feed completamente inválido produce error y no estado vacío. Un fallo del mapa no bloquea lista ni detalle. Los errores permiten reintentar y no muestran eventos inventados. Un fallo de consulta tras cambiar el período restaura el último período cargado correctamente.
- **AC-09 (FR-013):** Al entrar en Historial se consultan los eventos válidos de los últimos siete días en orden descendente; el usuario puede actualizar manualmente y abrir el detalle del evento elegido.
- **AC-10 (FR-015):** En móvil no aparece desplazamiento horizontal. Período, umbral de magnitud, continente, actualizar, limpiar filtros, seleccionar evento y controles de zoom del mapa tienen áreas táctiles de al menos 44×44 px; la lista y selección también funcionan con teclado.

## Supuestos confirmados

- Monitor abre con el período de 24 horas y el filtro Todo el mundo.
- El filtro geográfico usa las coordenadas del epicentro y ofrece Norteamérica y Sudamérica como opciones separadas.

## Fuentes de referencia

- USGS, [GeoJSON Summary Format](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php): estructura de los feeds, campos del evento y frecuencia de actualización publicada.
- USGS, [Developer Resources & Software](https://earthquake.usgs.gov/data/software/): recomendación de feeds GeoJSON para eventos recientes.
- OpenFreeMap, [sitio y atribución](https://openfreemap.org/): estilos disponibles, atribuciones, uso de la instancia pública y ausencia de SLA.
