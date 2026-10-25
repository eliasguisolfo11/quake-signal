# QuakeSignal: Análisis de actividad sísmica y contexto de zona

## Estado

Borrador — pendiente de revisión y aprobación del usuario.

## Contexto

QuakeSignal ofrece Monitor e Historial con eventos públicos de USGS, filtros por continente y detalle verificable por evento. Esta función agrega una página para explorar patrones del catálogo histórico, comparar países y consultar el contexto tectónico de eventos seleccionados.

La página describe eventos registrados dentro de filtros explícitos. El conteo del catálogo no equivale a una predicción ni a una evaluación de peligro, daño o seguridad local. El resultado también depende de lo que la fuente registró para el período y la magnitud elegidos.

## Usuarios

Personas que quieren comparar la actividad sísmica registrada entre lugares y períodos, consultar su distribución y verificar los datos y el contexto asociado.

## Historias de usuario

- **US-01:** Como visitante, quiero ver estadísticas de eventos sísmicos registrados para un período y magnitud elegidos, para comparar patrones de actividad.
- **US-02:** Como visitante, quiero identificar los países con más eventos registrados y ver los eventos oceánicos y no asignados por separado, para entender cómo se clasificó cada epicentro.
- **US-03:** Como visitante, quiero seleccionar un país para explorar sus eventos y luego elegir un sismo para consultar el contexto de su epicentro.
- **US-04:** Como visitante, quiero verificar fuentes, período y filtros de cada estadística para reproducir o contrastar lo que veo.

## Requisitos funcionales

- **FR-001 — Página de análisis:** la navegación principal permite abrir una página Análisis distinta de Monitor e Historial.
- **FR-002 — Período:** la página ofrece ventanas móviles de últimos 30 días, 12 meses y 5 años; abre en últimos 30 días. Cada consulta usa un instante de corte, expresado como UTC, e intervalo semiabierto desde inicio inclusive hasta corte exclusivo. El intervalo exacto se muestra en la página. Los gráficos agrupan por día para 30 días y por mes para 12 meses y 5 años; los intervalos sin eventos se representan como cero.
- **FR-003 — Magnitud mínima:** el visitante puede establecer o quitar un umbral mínimo de magnitud en pasos de 0,1, de acuerdo con el control existente. La comparación incluye el valor igual al umbral. Con umbral activo, eventos cuya magnitud no está disponible se excluyen del conjunto filtrado; sin umbral, se mantienen en el total y en grupos geográficos, pero se incluyen en la categoría Sin dato de la distribución de magnitud.
- **FR-004 — Región:** el visitante puede filtrar Todo el mundo o los continentes soportados por QuakeSignal, con Norteamérica y Sudamérica como opciones separadas.
- **FR-005 — Identidad y métricas:** cada evento se cuenta una sola vez por su identificador USGS. Identificadores ausentes se omiten; duplicados se deduplican. La página muestra total de eventos, mayor magnitud disponible y mediana de magnitud disponible en el conjunto filtrado. Valores ausentes no se convierten en cero. Cuando sea relevante se muestra cuántos eventos no tienen el dato requerido.
- **FR-006 — Tendencia temporal:** se muestra la cantidad de eventos por día o mes, en UTC según FR-002. La suma de intervalos coincide con el total filtrado.
- **FR-007 — Distribución de magnitud:** se usan los mismos intervalos definidos en DESIGN.md y compartidos con el mapa: menor que 2; de 2 a menor que 3; de 3 a menor que 4; de 4 a menor que 5; de 5 a menor que 6; de 6 a menor que 7; y 7 o más. Se agrega Sin dato cuando no hay un filtro de magnitud activo. Con un umbral activo, eventos sin magnitud ya quedaron excluidos del conjunto completo según FR-003 y no se cuentan en ninguna métrica o distribución. Los intervalos describen valores registrados; no representan daño ni peligro.
- **FR-008 — Distribución de profundidad:** se muestran las clases somera (0–70 km inclusive), intermedia (>70–300 km inclusive) y profunda (>300 km), siguiendo la clasificación general de USGS. Valores negativos o mayores a 700 km se muestran en Fuera de las clases estándar y profundidades ausentes en Sin dato. La fuente puede reportar valores negativos; no se corrigen ni se sustituyen silenciosamente.
- **FR-009 — Comparación geográfica:** un ranking y un mapa por país muestran conteos del conjunto filtrado. Los eventos se asignan por coordenadas del epicentro contra una versión identificada de límites administrativos y tierra publicados, no por interpretar el texto libre de lugar. Un punto dentro del interior de exactamente un país se asigna a ese país. Un punto dentro de agua se agrupa como Oceánico; un punto en tierra que no cae en un país disponible se agrupa como Tierra sin país asignado; puntos que caen en fronteras compartidas o polígonos solapados se agrupan como Sin asignar por frontera/solapamiento; coordenadas ausentes o inválidas se agrupan como Sin coordenadas. Estas categorías no se mezclan. La versión de geometrías no expresa una decisión de soberanía. El mapa y ranking representan conteos observados, no riesgo.
- **FR-010 — Ficha de país:** seleccionar un país abre una ficha con período y filtros activos, conteo, serie temporal y eventos destacados. Los destacados se definen como los cinco eventos de mayor magnitud disponible y los cinco más recientes, sin duplicados. La lista por magnitud ordena magnitud descendente, luego origen más reciente e ID ascendente; los eventos sin magnitud no entran en ella. La lista reciente ordena origen descendente e ID ascendente y conserva eventos sin magnitud con la etiqueta Sin dato. Si un país tiene menos eventos, se muestran todos.
- **FR-011 — Contexto del epicentro:** desde la ficha de país se puede seleccionar un evento. El detalle muestra los datos oficiales disponibles y el contexto tectónico aplicable a las coordenadas de ese evento. Si solo se identifica el límite tectónico más cercano, se etiqueta como tal y no se afirma que haya causado el sismo. Si no hay datos tectónicos disponibles, se muestra “Sin datos tectónicos para esta ubicación”.
- **FR-012 — Procedencia verificable:** la página expone USGS, intervalo UTC, filtros, fecha/hora de consulta, estado de recuperación y versión de los límites geográficos utilizados. Los eventos enlazan a su registro oficial; los gráficos enlazan a la consulta del catálogo cuando sea posible. El estado se refiere a la recuperación de datos, no a la exhaustividad mundial del catálogo.
- **FR-013 — Cobertura de consultas:** si una consulta histórica requiere más de una página, todos los segmentos deben completarse y deduplicarse antes de presentar estadísticas como completas. Se compara la cantidad esperada del catálogo con los resultados recuperados. Si hay discrepancia compatible con cambios del catálogo durante la paginación, se reinicia la consulta una vez con un nuevo corte UTC. Si vuelve a haber discrepancia o un segmento falla, se identifica consulta incompleta y no se muestran agregados parciales como resultados completos.
- **FR-014 — Estados de datos:** error de fuente, respuesta inválida, consulta incompleta, catálogo válido sin eventos y filtros que producen cero coincidencias son estados distintos, con mensaje y acción apropiados. No se inventan eventos.
- **FR-015 — Lenguaje científico:** la interfaz habla de actividad observada en el catálogo y contexto tectónico. No predice ocurrencias, no llama a un lugar “seguro” o “peligroso” y no infiere daño o riesgo local a partir de magnitud, frecuencia histórica o cercanía a una placa.
- **FR-016 — Navegación:** cerrar o abandonar una ficha devuelve al análisis con período y filtros conservados. Si un nuevo filtro excluye la selección, la ficha se cierra y la selección se limpia, como en el detalle actual de eventos.

## Requisitos no funcionales

- La página es usable con teclado, con foco visible, nombres accesibles y contraste conforme a DESIGN.md.
- El diseño sigue DESIGN.md y se adapta a móvil, tablet y escritorio sin desplazamiento horizontal.
- La carga, error y ausencia de datos no hacen desaparecer filtros ni fuente.
- Los eventos, unidades, período y parámetros permanecen claros al consultar un gráfico.
- La selección puede operarse sin depender únicamente del color o del mapa.

## Casos límite

- El epicentro cae exactamente en una frontera compartida o geometrías de más de un país; se agrupa como Sin asignar por frontera/solapamiento. Un punto en tierra que no cae en un país disponible se agrupa como Tierra sin país asignado; un punto en agua se agrupa como Oceánico. La versión de geometrías no pretende resolver disputas territoriales.
- Las coordenadas son nulas o inválidas; se conserva el evento para métricas que no requieran coordenadas y se agrupa en Sin coordenadas. Si el epicentro cae en una frontera o solapamiento, se conserva para métricas y se agrupa en Sin asignar por frontera/solapamiento.
- Magnitud, profundidad, lugar o enlace oficial están ausentes.
- El catálogo devuelve más resultados de los que permite una sola consulta, cambia durante la paginación o no completa un segmento; ante una diferencia entre cantidad esperada y recuperada se reintenta una sola vez y después se informa recuperación incompleta.
- La consulta devuelve cero eventos, feed vacío válido, estructura inválida o error de red.
- Un país no tiene eventos, tiene menos de cinco eventos o no tiene magnitudes suficientes para ordenar destacados.
- No hay información tectónica para un evento seleccionado.
- Un filtro cambia mientras una consulta previa sigue pendiente; una respuesta antigua no sustituye la más reciente.
- Las sumas entre indicadores, intervalos temporales y grupos geográficos deben ser consistentes; las distribuciones muestran aparte los valores faltantes o fuera de clase.

## Fuera de alcance

- Pronósticos, probabilidades futuras o evaluación global de peligro sísmico.
- Estimaciones de daño, impacto poblacional, riesgo local o recomendaciones de seguridad.
- Crear alertas o sustituir avisos oficiales.
- Resolver reclamos de soberanía territorial.
- Autenticación, dashboards personales o guardado de búsquedas.

## Criterios de aceptación

- **AC-01:** se puede abrir Análisis desde navegación y distinguirlo de Monitor e Historial.
- **AC-02:** los tres períodos funcionan con límites UTC mostrados; el gráfico diario o mensual usa el intervalo indicado y contiene cero en los días/meses sin eventos.
- **AC-03:** total, máximo y mediana se calculan sobre eventos únicos con los filtros activos; magnitudes faltantes siguen la regla de FR-003.
- **AC-04:** la suma de la serie temporal equivale al total; la suma de todos los países más Oceánico, Tierra sin país asignado, Sin asignar por frontera/solapamiento y Sin coordenadas equivale al total.
- **AC-05:** las distribuciones usan exactamente los intervalos de FR-007 y FR-008. Con umbral de magnitud activo, los eventos sin magnitud están excluidos del conjunto completo; sin ese umbral, se cuentan en Sin dato. Las profundidades faltantes o fuera de clase se muestran en sus categorías correspondientes y nunca se convierten en cero.
- **AC-06:** una coordenada interior de un solo país se asigna a ese país; una coordenada en agua aparece como Oceánico; tierra sin país en la geometría aparece como Tierra sin país asignado; frontera/solapamiento aparece como Sin asignar por frontera/solapamiento; coordenada ausente o inválida aparece como Sin coordenadas. El criterio usa la versión fijada de geometrías.
- **AC-07:** seleccionar un país abre su ficha; muestra hasta cinco eventos más fuertes y cinco más recientes sin repetir, o todos si hay menos.
- **AC-08:** seleccionar un evento abre contexto para sus coordenadas y distingue explícitamente un límite cercano de una causa; si faltan datos tectónicos, se muestra el estado FR-011.
- **AC-09:** filtros, fichas, gráficos, ranking y selección de países en el mapa se pueden operar con teclado: Tab enfoca controles y filas/países, Enter o Space selecciona, y un control visible permite volver/cerrar la ficha. El mapa tiene nombre accesible y alternativa de ranking operable por teclado; no hay desplazamiento horizontal en móvil.
- **AC-10:** error de fuente, feed inválido, consulta incompleta, catálogo vacío y cero resultados por filtros producen mensajes distintos. Una discrepancia entre cantidad esperada y recuperada dispara un reintento; si persiste, no se muestra resumen aparentemente completo.
- **AC-11:** cada vista de datos identifica USGS, período UTC, filtros, momento de consulta y versión/procedencia geográfica; enlaces a eventos abren los registros USGS.
- **AC-12:** la aplicación no usa lenguaje de pronóstico, peligro, daño o seguridad basado solo en conteos, magnitud o contexto tectónico.

## Supuestos para revisión

- Los períodos iniciales son 30 días, 12 meses y 5 años; el valor inicial es 30 días.
- Los límites temporales y series se expresan en UTC para que los intervalos sean reproducibles.
- El ranking será por país, con eventos oceánicos/sin territorio separados de los sin asignación.
- Seleccionar un país abre una ficha agregada; seleccionar un evento de esa ficha abre contexto tectónico del epicentro concreto.
- Las fronteras reflejan el dataset geográfico identificado y no constituyen una decisión sobre soberanía.
- Los conteos describen registros recuperados del catálogo para el filtro elegido, no una medición completa de la actividad mundial.

## Preguntas abiertas

- Ninguna bloqueante para este borrador. Las decisiones listadas en supuestos se someten a aprobación junto con la especificación.

## Fuentes previstas

- USGS, [Earthquake Catalog / FDSN Event Web Service](https://earthquake.usgs.gov/fdsnws/event/1/): eventos, consultas temporales, filtros y resultados GeoJSON.
- USGS, [Tectonic Plate Boundaries](https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer): contexto de placas tectónicas y procedencia del servicio.
- Natural Earth, [descargas de límites administrativos](https://www.naturalearthdata.com/downloads/): geometrías Admin 0 de países y tierra para distinguir eventos en agua de tierra fuera de una geometría de país; la especificación técnica fijará conjuntos, escala y versión.
- USGS, [Determining the Depth of an Earthquake](https://www.usgs.gov/programs/earthquake-hazards/determining-depth-earthquake): clasificación general de profundidad en somera, intermedia y profunda.
- USGS, [National Seismic Hazard Maps](https://www.usgs.gov/maps/seismic-hazard-maps-conterminous-united-states): referencia para distinguir mapas probabilísticos de amenaza de conteos históricos. Esta función no implementa esos mapas.
