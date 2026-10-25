# Dirección de interfaz — T-11

- **Pregunta principal:** ¿qué actividad sísmica registrada hubo durante el período elegido y dónde se concentró?
- **Objeto:** evento USGS único por `id`, con magnitud (Mw reportada, puede faltar), profundidad (km), origen (UTC), epicentro (lat/lon), lugar y enlace oficial.
- **Períodos:** ventanas móviles de 30 días, 12 meses y 5 años; los límites y las series se muestran en UTC.
- **Filtros:** magnitud mínima opcional en pasos de 0,1 y continente, con Norteamérica y Sudamérica separados.
- **Magnitudes reales observadas:** dependen del corte consultado; la respuesta API incluye conteo esperado/recuperado, intento y estado, sin exponer métricas parciales.
- **Tendencia:** diaria en 30 días y mensual en 12 meses/5 años; los buckets sin eventos permanecen como cero.
- **Distribuciones:** bandas de magnitud compartidas con el mapa, profundidad (km), datos ausentes y valores fuera de clase separados.
- **Geografía:** ranking por países atribuido desde el epicentro con países de cero eventos y cuatro grupos no asignados separados.
- **Persona y trabajo principal:** visitante de portfolio o persona curiosa por datos sísmicos, en desktop o teléfono; elegir un período/umbral y leer concentración observada.
- **Producto propio:** marca tipográfica QuakeSignal, epicentro como objeto visual y datos USGS/Natural Earth con versión visible; no se inventan cifras ni tendencias comparativas.
- **Acción y evidencia:** aplicar filtros; la línea bajo el título resume el resultado actual, y la procedencia muestra intervalo, consulta, hora de recuperación y cobertura.

## Decisiones visuales

- **Estilo elegido:** `data-terminal`, oscuro, seed `590052279`, por su lectura de monitoreo prolongado, dígitos alineados y selección marcada con una línea de acento de 1 px.
- **Paleta y tipografía:** se conservan los tokens de `DESIGN.md`; cifras en IBM Plex Mono y texto en IBM Plex Sans, como decisión para hacer legibles magnitudes, conteos y fechas.
- **Shell:** se conserva la barra horizontal de QuakeSignal; no se introduce el icon rail del patrón porque `DESIGN.md` fija una navegación superior y la app ya la comparte entre Monitor e Historial.
- **Composición adaptada:** una sola serie temporal de actividad, sin acumulado redundante porque no existe una meta o capacidad que cruce; distribuciones y ranking responden a preguntas distintas. En T-12, el ranking se complementa con el mapa interactivo.
- **Elemento propio:** una lectura de epicentros observados: actividad diaria/mensual acentuada y ranking de países calculado desde el mismo conjunto de eventos y filtros.
- **Estado de hallazgo:** siempre se deriva de la respuesta real; el mayor conteo es “más registros observados”, nunca una predicción de sismos o riesgo.
