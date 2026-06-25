Prompts Backend + Base de Datos para Polo Connect

Objetivo
- Crear backend sólido y base de datos escalable para 5.000 usuarios iniciales y 20.000 a futuro.
- Integrar sin romper el frontend existente.

Cómo usar esta guía
1. Ejecuta los prompts en este orden.
2. Usa primero un modelo económico para borradores y luego uno premium para validación final.
3. Al final de cada prompt, pide siempre:
   - Decisiones tomadas
   - Riesgos
   - Pendientes
   - Siguiente prompt recomendado

Prompt 00 - Recuperación de contexto (si se pierde el chat)
Actúa como arquitecto backend senior. Voy a darte un proyecto frontend de app social de polo con módulos: autenticación, live matches, comunidad/chat, marketplace, torneos, notificaciones, perfil y settings.

Necesito que primero reconstruyas el contexto completo del frontend y extraigas:
1) Rutas y pantallas
2) Flujos E2E
3) Modelos de datos implícitos
4) Contratos API necesarios
5) Riesgos de escalabilidad para 5k-20k usuarios

Luego devolvé:
A) Resumen ejecutivo
B) Tabla de módulos y endpoints
C) Entidades y relaciones
D) Arquitectura backend recomendada
E) Plan por fases

No escribas código todavía. Solo análisis y diseño.

Prompt 01 - Arquitectura objetivo
Actúa como principal engineer. Diseña la arquitectura backend de producción para una app móvil social + marketplace + realtime.

Restricciones:
- Escala inicial 5.000 usuarios, objetivo 20.000
- Chat en tiempo real
- Actualización de partidos en vivo
- Seguridad de autenticación y autorización robusta
- Integración limpia con frontend ya existente

Entregables:
1) Decisión de arquitectura: monolito modular o microservicios, con justificación
2) Mapa de módulos de dominio
3) Responsabilidades por módulo
4) Límites transaccionales
5) Estrategia de evolución futura

Incluye pros, contras y riesgos.

Prompt 02 - Modelo de datos relacional completo
Diseña una base PostgreSQL completa para los módulos:
- users/auth
- profiles
- chat rooms, memberships, messages
- matches, match events, lineups, stats
- tournaments, teams, registrations
- products, favorites, seller contacts
- notifications
- audit logs

Requisitos:
1) Tablas con PK/FK
2) Unique constraints
3) Índices por query real de app
4) Soft delete donde aplique
5) Campos created_at, updated_at y version para concurrencia
6) Estrategia para búsquedas de marketplace

Devuelve:
A) Diagrama textual de entidades
B) SQL DDL por tabla
C) Lista de índices y por qué existen
D) Riesgos de lock/concurrencia y mitigación

Prompt 03 - Contrato API REST completo
Diseña la especificación API REST de producción para todos los módulos.

Formato requerido por endpoint:
- Método y ruta
- Auth requerida
- Body y query params
- Respuesta exitosa
- Errores posibles con código HTTP
- Reglas de negocio

Incluir:
1) Auth: register, login, refresh, logout, me
2) Market: CRUD productos, favoritos, búsqueda paginada
3) Community: rooms, join/leave, histórico de mensajes
4) Live: partidos, detalle, eventos
5) Tournaments: calendario, registro de equipos
6) Notifications: listado, marcar leído

Además:
- Define estándar de errores unificado
- Define convención de paginación
- Define versionado de API

Prompt 04 - Tiempo real (WebSocket)
Diseña arquitectura realtime para:
- Chat por sala
- Eventos de partidos en vivo
- Notificaciones push in-app

Entregables:
1) Canales/eventos por módulo
2) Payload de cada evento
3) Estrategia de reconexión cliente
4) Control de presencia y unread count
5) Garantía de orden de mensajes
6) Estrategia de escalado horizontal con Redis Pub/Sub

Incluye ejemplo de secuencia de eventos para:
- Usuario se une a sala
- Usuario envía mensaje
- Otro cliente recibe actualización

Prompt 05 - Seguridad y autorización
Diseña seguridad de backend de nivel producción.

Cobertura mínima:
1) JWT access/refresh con rotación
2) Revocación de sesiones
3) Hash de password seguro
4) Roles y permisos por recurso
5) Ownership checks en marketplace y chats
6) Rate limiting y anti abuso
7) Validación y sanitización de inputs
8) Auditoría y trazabilidad

Devuelve checklist accionable y políticas concretas.

Prompt 06 - Rendimiento y escalabilidad 5k a 20k
Actúa como arquitecto de performance.

Necesito:
1) Presupuesto de latencia por endpoint crítico
2) Estrategia de caché con Redis
3) Pooling de conexiones PostgreSQL
4) Paginación y límites por endpoint
5) Índices críticos de DB
6) Plan de capacidad por fases

Incluye:
- Cuellos de botella esperables
- Métricas a monitorear
- SLO y alertas recomendadas

Prompt 07 - Estructura de proyecto backend lista para codificar
Genera la estructura de carpetas backend de un monolito modular lista para implementación.

Requisitos:
1) Capas por módulo: handler, service, repository, dto, entity
2) Config centralizada por ambiente
3) Migraciones versionadas
4) Middleware global de errores, auth y logging
5) Carpeta de tests unitarios e integración

Devuelve el árbol completo y propósito de cada carpeta.

Prompt 08 - Plan de implementación por sprints
Crea un plan detallado por sprints para pasar de frontend mock a backend real.

Formato:
- Sprint 1, Sprint 2, etc.
- Objetivo
- Tareas técnicas
- Criterios de aceptación
- Riesgos
- Dependencias

Prioriza:
1) Auth + users
2) Market CRUD + favorites
3) Chat rooms + messages
4) Matches + live events
5) Tournaments + registrations
6) Notifications

Prompt 09 - Integración Frontend-Backend sin romper UX
Diseña el plan de integración con frontend existente.

Necesito:
1) Mapeo de cada pantalla a endpoint real
2) Estrategia para reemplazar contextos in-memory por datos remotos
3) Manejo de loading, errores y retry
4) Caché local y sincronización
5) Plan de migración incremental por módulo

Entrega una matriz pantalla -> endpoint -> estado esperado.

Prompt 10 - Testing y calidad
Diseña estrategia de calidad completa.

Incluir:
1) Unit tests por capa
2) Integration tests con DB real
3) E2E API tests
4) Tests de carga para chat y market search
5) Contract testing frontend-backend

Devuelve:
- Casos de prueba críticos
- Cobertura mínima objetivo
- Pipeline de CI recomendado

Prompt 11 - DevOps y despliegue
Diseña estrategia DevOps para producción.

Necesito:
1) Dockerfiles y ambientes
2) Variables de entorno por stage
3) Migraciones seguras en deploy
4) Rollback
5) Observabilidad (logs, métricas, trazas)
6) Backup y recuperación de DB

Incluye runbook de incidentes críticos.

Prompt 12 - Go-live checklist
Crea checklist final de lanzamiento para backend + DB + integración móvil.

Categorías:
1) Seguridad
2) Performance
3) Datos
4) Observabilidad
5) Operación
6) UX y resiliencia móvil

El resultado debe ser una lista binaria (cumple/no cumple) con criterios verificables.

Prompt Maestro Único (si quieres hacer todo en una sola corrida)
Actúa como arquitecto backend principal y staff engineer. Necesito diseñar e implementar un backend y base de datos de producción para una app móvil social de polo con módulos: auth, live matches, community chat, marketplace, tournaments, notifications, profile y settings.

Contexto:
- Frontend existente y funcional
- Actualmente usa datos mock e in-memory
- Debe escalar de 5.000 a 20.000 usuarios
- Requiere chat en tiempo real y actualizaciones live

Quiero que entregues en este orden:
1) Arquitectura recomendada y justificación
2) Modelo de datos PostgreSQL completo
3) Contrato API REST por módulo
4) Diseño WebSocket por eventos
5) Seguridad y autorización
6) Estrategia de rendimiento y cache
7) Estructura de proyecto backend lista para implementar
8) Plan por sprints
9) Plan de integración con frontend
10) Estrategia de testing
11) Estrategia de despliegue
12) Checklist de go-live

Condiciones:
- No respuestas genéricas
- Decisiones concretas, con trade-offs
- Enfatizar mantenibilidad y escalabilidad
- Incluir riesgos y mitigaciones
- Incluir próximos pasos accionables
