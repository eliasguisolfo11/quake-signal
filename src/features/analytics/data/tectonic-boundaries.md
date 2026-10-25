# Snapshot de límites de placas tectónicas

- Fuente: [USGS Plates (ID 1)](https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1)
- Consulta de geometría: [ArcGIS REST query](https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1/query?where=1%3D1&outFields=OBJECTID%2CNAME%2CLABEL&outSR=4326&returnGeometry=true&f=geojson)
- Recuperado: 2026-10-25T21:59:51.624Z
- Registros esperados: 1175; IDs solicitados y geometrías recibidas verificados
- Propiedades conservadas: sourceObjectId, boundaryName (campo USGS NAME) y boundaryType (campo USGS LABEL)
- Elementos sin NAME en la fuente: 3; se conserva la geometría y el tipo con nombre nulo
- Geometrías: LineString 1173, MultiLineString 2
- Categorías: Convergent Boundary, Divergent Boundary, Other, Transform Boundary
- SHA-256 del snapshot reducido: 85bd1dc269b66529fd79e5e544b15c30bc9351be4ac145a46d6dff3bfcc98c10

El script scripts/prepare-tectonic-boundaries.mjs reproduce el snapshot: valida el tipo y nombre de la capa, compara el conteo con la lista completa de IDs, recupera los IDs en páginas que respetan el límite del servicio y comprueba que no falten ni se dupliquen elementos. La fecha y el hash identifican esta instantánea; no son una fecha de origen geológico.

La línea más cercana solo describe proximidad geométrica aproximada entre las coordenadas disponibles y la capa. No establece la causa del sismo ni predice actividad futura.
