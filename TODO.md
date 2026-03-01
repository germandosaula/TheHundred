# TODO

## Foundation

- [x] Crear la estructura monorepo `apps/*` y `packages/*`
- [x] Anadir configuracion raiz de workspaces y TypeScript
- [x] Crear README inicial del proyecto
- [ ] Inicializar repositorio Git
- [ ] Configurar linting y formatting
- [x] Configurar variables de entorno por app

## Domain

- [x] Definir entidades base del dominio
- [x] Implementar FSM de `GuildMember`
- [x] Implementar FSM de `CTA`
- [x] Implementar calculo base de puntos
- [x] Implementar ranking desde `points_history`
- [ ] Anadir dominio de `Invite`
- [ ] Anadir dominio de `Build`
- [ ] Anadir dominio de `RegearRequest`
- [ ] Anadir errores de dominio por caso de uso
- [ ] Cubrir dominio con tests unitarios

## Database

- [x] Crear repositorio seed en memoria
- [x] Disenar esquema SQL para Supabase/Postgres
- [x] Anadir migraciones iniciales
- [x] Definir constraints unicas del RFC
- [x] Definir indices del RFC
- [x] Implementar repositorios reales sobre Supabase
- [x] Configurar Row Level Security
- [x] Anadir seeds de desarrollo
- [x] Permitir seleccion de provider `memory|supabase` por entorno
- [x] Persistir `Comps` compartidas en Supabase
- [x] Soportar `Comps` multi-party con slots variables por party

## API

- [x] Crear servidor HTTP inicial
- [x] Implementar `GET /health`
- [x] Implementar `GET /public/slots`
- [x] Implementar `GET /me`
- [x] Implementar `POST /register`
- [x] Implementar `GET /ctas`
- [x] Implementar `GET /ranking`
- [x] Implementar `POST /ctas`
- [x] Implementar `POST /ctas/{id}/finalize`
- [x] Implementar `POST /members/{id}/status`
- [x] Implementar `POST /regear/{id}/approve`
- [x] Separar rutas, servicios y repositorios
- [x] Hacer finalizacion de CTA idempotente con generacion reversible de puntos
- [x] Implementar autenticacion con Discord OAuth
- [x] Implementar autorizacion real por rol
- [x] Validar payloads de entrada
- [x] Bloquear dashboard privado hasta reclutamiento aprobado
- [x] Implementar `GET /comps`
- [x] Implementar `POST /comps`
- [x] Implementar `DELETE /comps/{id}`
- [ ] Anadir tests de integracion

## Web

- [x] Crear app Next.js inicial
- [x] Mostrar slots, ranking y CTAs en homepage
- [x] Crear login con Discord OAuth
- [x] Crear flujo de registro
- [x] Persistir solicitud de reclutamiento web con formulario real
- [x] Mostrar paso "continua en Discord" tras el formulario
- [x] Crear panel de officer
- [x] Alinear UX web con reclutamiento Discord-first
- [ ] Crear vista detallada de CTA
- [ ] Crear gestion de estados de miembros
- [x] Crear vista privada de Comps editable para officer/admin
- [x] Crear listado publico-interno de `Comps` para roster privado
- [x] Crear editor de `Comps` multi-party
- [x] Permitir drag and drop en slots de party
- [x] Permitir borrado de `Comps` desde editor
- [ ] Crear vista de regear
- [ ] Anadir manejo de errores y estados vacios
- [ ] Anadir diseno responsive final

## Discord Bot

- [x] Crear bootstrap del bot
- [x] Implementar comando `/slots`
- [x] Compartir backend real entre bot y web/api
- [x] Implementar comando base `/recruit`
- [x] Abrir ticket automatico de reclutamiento desde solicitudes web
- [x] Crear/sincronizar `GuildMember` al asignar rol valido en Discord
- [ ] Registrar comandos de forma controlada por entorno
- [ ] Anadir publicacion de CTA en Discord
- [ ] Anadir tracking de asistencia por reacciones
- [ ] Anadir sincronizacion de roles cada 5 minutos
- [ ] Anadir logs operativos del bot

## Killboard

- [x] Crear cliente tipado inicial
- [ ] Integrar Albion Killboard API real
- [ ] Gestionar rate limits y reintentos
- [ ] Anadir casos de uso dependientes de killboard

## Security

- [x] No confiar en claims de frontend a nivel de diseno
- [x] Forzar permisos officer/admin en casos base del servidor
- [ ] Implementar sesiones seguras
- [ ] Implementar validacion server-side de identidad Discord
- [ ] Disenar politicas RLS
- [ ] Revisar superficies de escalado de privilegios

## Observability

- [ ] Anadir logging estructurado
- [ ] Medir miembros activos
- [ ] Medir slots usados
- [ ] Medir media de asistencia ultimas 5 CTAs
- [ ] Medir distribucion de roles
- [ ] Medir total mensual de regear

## Deployment

- [ ] Elegir estrategia de despliegue para web, api y bot
- [ ] Configurar CI/CD
- [ ] Configurar secretos
- [ ] Preparar entorno de produccion
- [ ] Completar despliegue v1

## Acceptance Criteria v1

- [x] Registro via Discord OAuth
- [x] Flujo de aprobacion de officer base por bot/comando
- [ ] Creacion y publicacion de CTA
- [ ] Tracking de asistencia por reacciones
- [ ] Asignacion automatica de puntos
- [ ] Computo de ranking
- [x] Comando `/slots` operativo a nivel de codigo
- [ ] Despliegue de produccion completado
