# Uso de inteligencia artificial

## 1. Herramientas de IA utilizadas

- **Claude Code** (CLI de Anthropic), modelo **Claude Sonnet 5** (`claude-sonnet-5`).

## 2. Prompts y casos de uso

Ejemplos de prompts clave usados durante el diseño y la construcción del proyecto:

- Planteamiento inicial del problema y las historias de usuario, a partir de un documento de contexto previo (`airline-realtime-system.md`), pidiendo continuar el diseño desde el punto pendiente.
- Discusión arquitectónica dirigida: *"¿Qué tipo de clean architecture se quiere usar, hexagonal o alguna otra?"*, seguida de una petición explícita de discutir trade-offs en vez de recibir una decisión ya tomada, y del recordatorio *"recuerda que esto es una prueba técnica, no una aplicación pensada para llevarla a productivo"* — que ajustó el criterio de la recomendación (señal arquitectónica vs. esfuerzo, no "qué es correcto para producción").
- Delegación de una tarea de diseño detallado (estructura de carpetas hexagonal-lite del backend, ports, casos de uso, adapters, integración de `/shared`) a un subagente de planificación, seguida de revisión y una pregunta puntual para resolver una tensión real detectada por el propio agente (el gateway WS necesitaba invocar un caso de uso de otro módulo, aparentemente rompiendo la regla de dependencia unidireccional).
- Instrucciones incrementales para acotar el alcance del primer commit: primero solo estructura de carpetas, luego "configuración básica del backend y frontend según el stack", luego agregar Docker, luego exigir flujo git-flow con rama `main` y una rama de trabajo descriptiva para el scaffold.
- Revisión crítica del código existente (*"¿este código está limpio con buen manejo de errores y separación de responsabilidades?"*), que identificó como débil el manejo de errores (sin filtro global en el backend, errores HTTP descartados en el frontend, socket sin manejo de desconexión, cero tests) seguida de la implementación del endurecimiento propuesto. El detalle de las decisiones está en la tabla de §5.

## 3. Refactorización y criterio propio

- El diseño inicial delegado al subagente de planificación proponía por defecto Hexagonal estricto/Clean Architecture de 4 anillos como punto de partida "correcto"; se corrigió explícitamente hacia **hexagonal-lite** (ports solo en las 3 fronteras volátiles: persistencia, lock de Redis, notificación realtime) porque el enunciado original prioriza no sobreingenierizar una prueba técnica.
- El subagente señaló una inconsistencia real entre "el gateway de Socket.io necesita invocar el caso de uso de `seats` para el evento `seat:block`" y la regla "los módulos de dominio dependen de `realtime`, no al revés". En vez de aceptar la primera solución propuesta sin más, se evaluaron explícitamente dos alternativas (gateway único con acoplamiento acotado y documentado, vs. gateway separado por módulo) y se decidió con criterio propio la opción de menor ceremonia, dejando la excepción documentada en `architecture.md` en vez de ocultarla.
- Los Dockerfiles generados inicialmente asumían `COPY . .` con contexto de build limitado a `backend/`/`frontend/`, lo cual habría roto la resolución de `../shared` en tiempo de build. Se corrigió manualmente el contexto de build a la raíz del repo y se ajustó cada Dockerfile para copiar `shared/` de forma explícita antes del código de cada app.

## 4. Impacto

- **Diseño arquitectónico**: la discusión guiada con la IA permitió explorar y descartar rápidamente Hexagonal estricto y Clean Architecture de 4 anillos como opciones de sobreingeniería, llegando a una decisión (hexagonal-lite) justificada y documentada en menos tiempo del que habría tomado evaluar cada alternativa manualmente.
- **Scaffolding**: la generación inicial de `package.json`, configuración de TypeORM/Redis, Docker Compose y estructura de carpetas ahorró tiempo de configuración repetitiva, dejando más tiempo disponible para la implementación de las historias de usuario y la lógica de concurrencia (que es donde está el verdadero reto del ejercicio).
- **Documentación**: mantener `architecture.md` y este mismo documento actualizados en paralelo al desarrollo, en vez de escribirlos al final, redujo el riesgo de que las decisiones y sus razones se perdieran u olvidaran.
- **Robustez**: el endurecimiento de errores dio un piso mínimo de producción (errores estructurados y logueados, cliente de API con timeout y errores tipados, UI que avisa si se pierde el realtime y se resincroniza al reconectar, primeros tests) sin desviarse del criterio hexagonal-lite: se tocó solo donde había fricción real, evitando sobre-ingeniería.

## 5. Sesión de endurecimiento de errores

| Decisión | Justificación |
|---|---|
| **Filtro global de excepciones** en `backend/src/common/filters/` (nueva carpeta `common/` de infraestructura transversal), registrado vía `app.useGlobalFilters`. Responde JSON estructurado `{ statusCode, message, error, timestamp, path }`; loguea 4xx como warning y ≥500 con stack trace. | Antes todo fallo inesperado era un 500 genérico de Nest sin body estructurado ni traza. Centralizar en un filtro evita repetir `try/catch` por ruta y mantiene una sola forma de error en la API. En 5xx el mensaje es genérico para no filtrar internals (stack, mensajes de driver) al cliente. |
| **Cliente API tipado en el frontend**: un solo `apiFetch` con timeout (AbortController) que lanza `ApiError { status, endpoint }`; `status: null` distingue fallo de red/timeout de una respuesta HTTP. | El código previo descartaba el error real (`throw new Error('Failed to...')`) y no diferenciaba causa; la UI mostraba siempre el mismo mensaje. Con `ApiError` cada llamada puede adaptar el mensaje al usuario y loguear la causa. |
| **Ciclo de vida del socket centralizado** en `lib/socket.ts` (suscriptores de `connect`/`disconnect`/`connect_error`) + hook `useSocketStatus`, banner de conexión perdida y **resync de la última búsqueda al reconectar**. | El socket se conectaba con `autoConnect` pero nadie se enteraba de una caída: la UI seguía afirmando "Estado en tiempo real". Al reconectar, re-ejecutar la última búsqueda recupera los eventos perdidos mientras estuvo caído, sin requerir interceptación a nivel de negocio. |
| **Demo/QA desacoplado de la presentación**: el botón "cambiar estado ↻" pasó de `FlightList` (donde el componente presentacional llamaba directamente a la capa API) a la página, vía callback `onDemoStatusChange`, con su propio `try/catch`. | Ante un fallo del PATCH se producía un *unhandled promise rejection*. Ahora el componente no conoce la API y el error se reporta en la UI. |
| **Primeros tests del backend** (`usecase`, `service`, `mapper`), `jest.config.js` con mapeo de `@shared/*` y `tsconfig.build.json` para excluir `*.spec.ts` del build. | El usecase se testea mockeando justamente los ports (`FlightRepositoryPort`, `RealtimeNotifierPort`), lo que valida la decisión de aislarlos. Jest ya estaba declarado en `package.json` sin configuración ni tests. |

_Nota: se agregó `@types/express` a las devDependencies del backend para tipar `Request`/`Response` en el filtro global._

_Este documento se irá actualizando a medida que se implementen las historias de usuario._
