lo 🙌 vamos a dejar esto como si fuera la sección de diseño de algoritmo de tu documento técnico.

Te lo organizo así:

Contexto

Descripción del problema

Criterios y restricciones

Suposiciones del sistema

Propuesta de algoritmo (paso a paso, alto nivel)

Dónde se usan distancias “aprox” y dónde rutas reales

1. Contexto

Se desea implementar un sistema de reparto tipo Uber Eats / Rappi, donde:

Un restaurante genera varios pedidos (orders) hacia distintos clientes.

Existen varios conductores (drivers) conectados a la app móvil.

Un conductor puede realizar un viaje con varios pedidos a la vez (batch).

El sistema debe agrupar pedidos cercanos entre sí y asignarlos al mejor conductor disponible, optimizando distancia/tiempo, sin perder la simplicidad.

El algoritmo se piensa para un backend en Node/NestJS + Prisma, pero la lógica es independiente del framework.

2. Descripción del problema

Dado:

Un conjunto de m pedidos de un mismo restaurante, todos en estado READY_FOR_PICKUP.

Un conjunto de n conductores, cada uno con:

estado (DISPONIBLE/OCUPADO),

ubicación actual (lat/lng),

hora de finalización de su último viaje.

Se quiere:

Agrupar los pedidos en uno o varios batches (viajes), de modo que:

cada batch contenga pedidos cuyos clientes están relativamente cerca entre sí;

no se haga esperar demasiado a los pedidos para entrar a un batch;

el tamaño de cada batch sea razonable (ej. 2–3 pedidos).

Asignar cada batch a un conductor, de manera que:

el conductor esté disponible;

esté dentro de un radio razonable del restaurante;

idealmente llegue al restaurante en poco tiempo (ETA bajo);

se mantenga cierta equidad (conductores que llevan más tiempo esperando tienen ventaja).

Optimizar el orden de entrega dentro de cada batch (ruta óptima):

determinar en qué orden visitar los clientes para minimizar la distancia/tiempo total.

No escribir nada en la base de datos (DeliveryBatch, DeliveryStops, cambios de estado)
hasta que el conductor acepte la oferta (Trip Request Card).

3. Criterios y restricciones
Criterios funcionales

Agrupar pedidos por cercanía geográfica de los clientes.

Considerar un tiempo máximo de espera para que un pedido pueda esperar a otros y formar batch.

Asignar batches solo a conductores disponibles dentro de un radio máximo al restaurante.

Seleccionar el conductor más conveniente según:

distancia/ETA real al restaurante,

tiempo inactivo (idle time) desde su último viaje.

Calcular un orden óptimo de entregas dentro del batch.

Realizar la persistencia en BD solo después de que el conductor acepte.

Restricciones

El batch es siempre de un solo restaurante.

Un conductor solo puede tener un viaje activo a la vez.

El número de pedidos por batch es limitado (ej. 2–4) para evitar rutas muy largas.

El sistema debe escalar sin depender de algoritmos demasiado pesados.

4. Suposiciones del sistema

Cada Order tiene:

restaurantId,

coordenadas del cliente (latitude, longitude),

status (incluyendo READY_FOR_PICKUP),

createdAt o readyAt (momento desde el que puede ser batcheado).

Cada Conductor tiene:

estado (al menos: DISPONIBLE, OCUPADO),

latActual, lngActual,

lastCompletedAt (timestamp del último viaje completado).

Se cuenta con:

una librería de clustering (p. ej. density-clustering / DBSCAN),

una forma de calcular distancias Haversine (lat/lng → km),

opcionalmente, una API de mapas (Google Maps, Mapbox, etc.) para ETA/rutas reales.

5. Propuesta del algoritmo (tu solución)
FASE A – Agrupar pedidos en batches (clustering)

Obtener pedidos elegibles

Seleccionar pedidos de un restaurante con status = READY_FOR_PICKUP.

Opcionalmente filtrar por tiempo máximo de espera.

Preparar datos para clusterización

Construir una lista de puntos [lat, lng] de los clientes.

Aplicar clustering geográfico (p. ej. DBSCAN via density-clustering)

Usar un radio eps en km (por ejemplo 1–2 km).

Cada cluster representa un grupo de clientes cercanos.

Post-procesar clusters

Limitar el máximo de pedidos por batch (ej. 2–3).

Eliminar clusters vacíos o inválidos.

Resultado: lista de batches, donde cada batch = lista de pedidos cercanos.

En esta fase solo se usa distancia “geométrica” (Haversine), no rutas reales.

FASE B – Seleccionar conductor para cada batch

Obtener conductores disponibles

Filtrar conductores con estado = DISPONIBLE.

Filtrar por radio al restaurante (preselección rápida)

Usar distancia Haversine entre conductor y restaurante.

Mantener solo los conductores dentro de un radio máximo (ej. 3 km).

Si no hay candidatos → ampliar radio.

Calcular coste/score conductor–batch
Para cada batch y conductor elegible, calcular:

etaRest = ETA real desde conductor → restaurante

usando API de mapas (rutas reales) o aproximando con distancia/velocidad media.

idleMin = minutos desde lastCompletedAt.

Definir un score, por ejemplo:

score(driver, batch) = w1 * etaRest - w2 * idleMin


donde:

w1 da peso a la rapidez de llegada al restaurante.

w2 otorga cierta prioridad a quien lleva más tiempo sin viaje (justicia).

Asignar batches a conductores (MVP greedy)

Ordenar batches según antigüedad del primer pedido.

Para cada batch:

elegir el conductor disponible con score mínimo;

marcarlo como “reservado” en memoria para no asignarle otro batch en esta ronda.

Resultado: assignments = [{ batch, driver }, ...], todo aún en memoria.

FASE C – Calcular la ruta óptima dentro del batch (TSP mini)

Para cada batch:

Construir lista de puntos:

Restaurante,

Clientes del batch.

Construir matriz de distancias:

Ideal: usar API de rutas reales (tiempo/distancia por calle).

MVP: usar distancia Haversine entre puntos.

Resolver un TSP pequeño (2–4 clientes):

Probar todas las permutaciones,

Calcular distancia total (restaurante → cliente1 → cliente2 → ...),

Elegir la ruta con menor distancia/tiempo.

Guardar el orden de visita recomendado para ese batch.

Hasta aquí, todo sigue en memoria, sin cambios en BD.

FASE D – Construir y enviar la oferta al conductor

Para cada { batch, driver }:

Construir un objeto de “Trip Request Card” que incluya:

restaurante,

lista de pedidos en orden recomendado,

distancia y tiempo estimado,

ganancia estimada,

resumen para mostrar en la app del conductor,

preview de mapa (opcional).

Enviar la oferta al conductor (WebSocket, push, etc.).

⚠️ Aún no se crea DeliveryBatch ni DeliveryStop en la base de datos.
Todo son propuestas “tentativas”.

FASE E – Aceptación/rechazo y persistencia en BD

Si el conductor rechaza o la oferta expira:

No se crean registros en BD.

El sistema puede reasignar el batch a otro conductor o reintentar más adelante.

Si el conductor acepta la oferta:

Recién ahí se ejecuta una transacción en BD para:

Crear un DeliveryBatch con:

driverId,

restaurantId,

status = ASSIGNED,

otros campos relevantes.

Crear DeliveryStops usando el orden óptimo:

batchId,

orderId,

sequence,

stopStatus = PENDING.

Opcional: vincular cada Order al batch/stop.

A partir de ese momento, el viaje existe formalmente y se sigue el resto del flujo:

conductor recoge pedidos,

toca “Iniciar viaje”,

pedidos cambian a EN_CAMINO,

finalmente DELIVERED/CANCELLED,

batch termina en COMPLETED/CANCELLED.

6. Dónde se usan distancias aproximadas vs rutas reales

Clustering de pedidos (batches):

Se usa distancia aproximada por coordenadas (Haversine).

Objetivo: saber si los clientes están “más o menos cerca” para agruparlos.

Filtrado inicial de conductores por radio al restaurante:

También distancia Haversine.

Objetivo: excluir conductores demasiado lejos.

Cálculo de ETA para asignar batch a conductor:

Aquí sí es deseable usar rutas reales (API de mapas).

Objetivo: medir tiempos de llegada más realistas.

Ruta óptima dentro del batch (TSP):

Ideal → matriz de distancias/tiempos de una API de rutas.

MVP → Haversine funciona razonablemente si las distancias son cortas y la ciudad es “grid”.