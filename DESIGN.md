# QuakeSignal — Design

## Propósito

QuakeSignal es una interfaz para explorar actividad sísmica a partir de datos públicos. La pantalla principal responde primero: **qué eventos ocurrieron en el período seleccionado, dónde y con qué magnitud**.

El producto es informativo. La magnitud describe el evento; por sí sola no determina el impacto local ni reemplaza avisos oficiales. La interfaz debe mostrar la fuente y la frescura de los datos con claridad.

## Dirección visual

**Referencia:** [Paradigm en Godly](https://godly.design/website/paradigmai/).

Tomar de la referencia su superficie oscura y sobria, la tipografía clara, la jerarquía contenida y el uso de líneas finas para ordenar información. Adaptar ese lenguaje a una herramienta de monitoreo cuyo elemento principal es un mapa.

La personalidad propia de QuakeSignal nace de su dato central: el epicentro. Los marcadores del mapa y el evento seleccionado forman una lectura visual consistente entre mapa y feed. No incorporar marcas, textos, ilustraciones ni componentes de Paradigm.

**Carácter:** preciso, sereno y directo. La interfaz debe sentirse como una herramienta de observación, no como un panel de alarma.

## Principios

1. **El mapa responde primero.** Ocupa el área de trabajo más grande y muestra dónde están los eventos.
2. **Cada respuesta tiene evidencia.** Magnitud, ubicación, profundidad y hora acompañan a cada evento.
3. **La selección se sincroniza.** Elegir un marcador resalta su fila; elegir una fila centra el mapa en ese epicentro.
4. **La frescura es visible.** La hora del sismo y la última actualización del feed son datos diferentes y se presentan por separado.
5. **El color explica datos.** La interfaz usa superficies neutrales; el color aparece principalmente en magnitudes, estados reales de la fuente y foco.
6. **La vista funciona sin el mapa.** El feed y el detalle permiten consultar eventos con teclado y tecnologías de asistencia.

## Estructura de la pantalla principal

La pantalla de monitoreo evita una barra lateral permanente para conservar espacio para el mapa. La navegación principal queda en la barra superior.

### Barra superior

- Marca tipográfica QuakeSignal y símbolo sencillo inspirado en ondas de propagación.
- Navegación breve: Monitor e Historial.
- Estado del feed con última actualización y acción para volver a consultar.
- El estado nunca afirma “en tiempo real” si la fuente no ofrece esa garantía.

### Encabezado y filtros

- Título de pantalla: **Actividad sísmica**, entre 22 y 26 px.
- Resumen textual calculado del conjunto visible, por ejemplo: “18 eventos · magnitud máxima 4.8”.
- Controles para período, magnitud mínima y región.
- Períodos iniciales: última hora, 24 horas y 7 días.
- Los filtros activos se entienden por su etiqueta y estado seleccionado; no dependen únicamente del color.
- Orden inicial: más recientes primero. El usuario puede ordenar por magnitud cuando resulte útil.

### Área de trabajo

En escritorio, el área se divide en dos columnas alineadas y de altura equilibrada:

| Región | Proporción orientativa | Contenido |
| --- | --- | --- |
| Mapa | Flexible, alrededor de dos tercios | Mapa, marcadores, agrupación por zoom, leyenda y controles cartográficos |
| Feed | 340–400 px | Eventos recientes en filas compactas; detalle del seleccionado al entrar en ese estado |

El mapa y el feed empiezan a la misma altura. Las filas visibles del feed se limitan para que el panel no genere una lista interminable; la acción “Ver todos” abre Historial.

### Mapa

- Base oscura y neutral, con costas, fronteras y nombres de lugares en tonos secundarios.
- Los marcadores varían de tamaño según la magnitud y de tono según rangos declarados en la leyenda.
- La escala debe usar los valores de la fuente y dejar sus límites explícitos. No presentar esos rangos como niveles de daño.
- Al alejar el mapa, los eventos cercanos se agrupan. Al acercarlo, se muestran los eventos individuales.
- Un evento seleccionado se distingue con un contorno de 1 px y un estado visible; evitar halos luminosos.
- Leyenda, zoom y reinicio de vista permanecen accesibles sin cubrir información importante.
- La lista de eventos ofrece el mismo contenido esencial que el mapa.

### Feed de eventos

Cada fila muestra, en este orden:

1. Magnitud, como figura principal de la fila.
2. Ubicación reportada por la fuente.
3. Tiempo transcurrido y profundidad en una segunda línea.
4. Estado de alerta solo cuando la fuente lo proporciona.

Las filas se separan con líneas finas y usan alineación consistente. No llevan franjas alternadas ni iconos decorativos repetidos. Los números usan cifras tabulares.

### Detalle del evento

Al seleccionar un evento, el panel del feed pasa a mostrar su detalle y ofrece una acción clara para volver a la lista. El detalle incluye:

- Magnitud y lugar.
- Profundidad en kilómetros.
- Hora de origen, con UTC identificable.
- Coordenadas.
- Última actualización del evento, si está disponible.
- Fuente y enlace al registro oficial.

En móvil, el detalle abre sobre el mapa como una hoja inferior expandible. Cerrar el detalle conserva la posición y el filtro del feed.

## Identidad visual y tokens

La paleta toma la base oscura de Paradigm y reserva tonos expresivos para los datos sísmicos.

| Token | Valor inicial | Uso |
| --- | --- | --- |
| Fondo | #0B0D10 | Lienzo principal |
| Superficie | #12151A | Paneles y barra superior |
| Superficie elevada | #181C22 | Menús, controles y panel seleccionado |
| Borde | #2A3037 | Separadores y contornos discretos |
| Texto principal | #F1F3F5 | Títulos, magnitud y contenido principal |
| Texto secundario | #B4BBC5 | Ubicación, etiquetas y descripción |
| Texto terciario | #929AA5 | Metadatos, unidades y horas |
| Magnitud baja | #62BFB5 | Dato dentro del primer rango de la leyenda |
| Magnitud media | #E5B653 | Dato dentro del rango intermedio |
| Magnitud alta | #EF7862 | Dato dentro del rango superior |
| Foco | #F1F3F5 | Indicador visible de foco de teclado |

Los rangos concretos de magnitud se definen junto con la fuente de datos y se imprimen en la leyenda. No codificar rangos diferentes en el mapa, el feed y el detalle.

### Tipografía

- Interfaz: Geist, con una alternativa sans-serif del sistema.
- Datos técnicos, coordenadas e identificadores: IBM Plex Mono, solo donde la precisión de alineación lo ayude a leer.
- Título de página: 22–26 px, peso medio.
- Título de panel: 15–16 px.
- Texto de filas: 14 px.
- Etiquetas y metadatos: 12 px como mínimo.
- Magnitud en la fila seleccionada: hasta 28 px.
- Usar cifras tabulares para magnitudes, coordenadas, fechas y profundidades.

### Espaciado y superficies

- Escala de espaciado: 4, 8, 12, 16, 24 y 32 px.
- Separación general entre regiones: 16–20 px.
- Padding de panel: 16–20 px.
- Radio de controles: 4–6 px; paneles: 8 px.
- Una línea fina o un cambio leve de superficie separa paneles. No usar borde y sombra juntos en superficies fijas.
- Las sombras se reservan para menús, ventanas emergentes y elementos que flotan.

## Interacciones

- Seleccionar un evento sincroniza el mapa, la fila y el detalle.
- Cambiar período o filtros actualiza el total, la lista, la leyenda contextual y los marcadores como una sola vista.
- Los controles del mapa tienen etiquetas accesibles y alternativas de teclado.
- La navegación por filas usa foco visible; el evento activo se identifica además de su color.
- Las transiciones son breves y funcionales: selección, apertura de detalle y aparición de un menú. No hay animaciones de entrada ni pulsos continuos.

## Estados de datos

- **Carga inicial:** conservar el espacio de cada región; mostrar etiquetas y filas en su ubicación final, sin brillo animado.
- **Actualización en curso:** mantener los datos ya visibles y actualizar el texto de frescura cuando llegue la respuesta.
- **Sin eventos:** mostrar el mapa y el marco del feed con “No se encontraron sismos en este período”.
- **Sin resultados por filtros:** nombrar los filtros activos y ofrecer “Limpiar filtros”.
- **Valor ausente:** mostrar un guion y no inferir profundidad, alerta o ubicación.
- **Error del feed:** mostrar el error dentro de la región afectada, incluir la hora del último dato correcto y ofrecer “Reintentar”.
- **Datos antiguos:** conservarlos con una indicación discreta de cuándo se recibieron. No mostrarlos como actuales.

## Responsive

### Escritorio — 1200 px o más

Mapa flexible y feed de 340–400 px. Encabezado, filtros y contenido comparten alineación. Todas las regiones principales muestran título y primera fila dentro de una ventana de 900 px de alto.

### Tablet — 641 a 1199 px

Mantener visible el mapa como superficie principal. El feed pasa a un panel plegable o una pestaña “Eventos”, según el ancho disponible. Evitar columnas tan estrechas que corten los nombres de lugares.

### Móvil — 640 px o menos

- Mapa a pantalla completa debajo de una barra superior compacta.
- Período visible; los filtros restantes se agrupan bajo un control “Filtros”.
- Feed en una hoja inferior deslizable, con un primer evento visible sin abrirla por completo.
- El detalle ocupa la hoja expandida; un control claro permite regresar a la lista.
- Áreas táctiles de al menos 44 × 44 px y márgenes laterales de 16–20 px.
- El feed conserva los datos de cada evento en filas de dos líneas; la página no requiere desplazamiento horizontal.

## Accesibilidad y confianza

- Contraste de texto de al menos 4.5:1 en los tamaños normales.
- Magnitud, etiquetas y forma del marcador acompañan al color.
- El mapa no es el único modo de localizar o comparar eventos.
- Los controles tienen nombre accesible, orden de tabulación y foco visible.
- La interfaz respeta la preferencia de movimiento reducido.
- Distinguir hora de origen, hora de actualización y hora local cuando se muestre más de una.
- No describir una magnitud como “segura”, “peligrosa” o equivalente sin un dato oficial específico que sostenga esa afirmación.

## Evitar

- Cuatro tarjetas KPI genéricas antes del mapa.
- Sidebar oscura independiente, gradientes, vidrio, resplandores o neón.
- Un color distinto para cada fila o categoría sin significado.
- Filas cebra, cabeceras en mayúsculas espaciadas o números alineados a la izquierda.
- Etiquetas diminutas, datos ficticios presentados como reales o sumas que no coinciden.
- Alertas inferidas por magnitud o mensajes que sugieran que el feed garantiza inmediatez.

## Criterios de aceptación visual

- El mapa es el bloque dominante y la pregunta principal se entiende al abrir la pantalla.
- Mapa, feed y detalle usan los mismos rangos, unidades y evento seleccionado.
- La frescura del feed puede distinguirse de la hora de cada sismo.
- La primera pantalla contiene el encabezado, los filtros, el mapa y las primeras filas del feed.
- Los estados vacío, carga, error y datos antiguos conservan la estructura de la pantalla.
- En móvil se puede filtrar, seleccionar un evento, consultar su detalle y regresar sin perder el contexto.
