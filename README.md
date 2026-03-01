# The Hundred

Monorepo inicial para la plataforma Web + API + Discord Bot definida en el RFC v1.1.

## Estructura

- `apps/web`: interfaz Next.js para ranking, slots y panel operativo.
- `apps/api`: API HTTP con reglas de dominio.
- `apps/bot`: bot de Discord con comando `/slots`.
- `packages/domain`: entidades, invariantes y servicios de dominio.
- `packages/db`: repositorio en memoria y semillas iniciales.
- `packages/discord`: utilidades de sincronizacion con Discord.
- `packages/killboard`: cliente tipado para futura integracion con Albion Killboard.

## Primeros pasos

1. `npm install`
2. `npm run dev:api`
3. `npm run dev:web`
4. `npm run dev:bot`

## Supabase Link

1. Crear un proyecto en Supabase
2. Copiar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` desde `Project Settings -> API`
3. Ejecutar `npm run supabase:login`
4. Ejecutar `npm run supabase:link -- --project-ref <project_ref>`
5. Ejecutar `npm run supabase:push`
6. Configurar `REPOSITORY_PROVIDER=supabase` en `apps/api/.env`

Despues puedes comprobar la API con `GET /health`, que ahora devuelve el provider activo.

Los scripts usan `npx supabase`, asi que no necesitas instalar la CLI globalmente.

## Variables previstas

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_SCOPES`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_ROLE_TRIAL_ID`
- `DISCORD_ROLE_CORE_ID`
- `DISCORD_ROLE_BENCHED_ID`
- `DISCORD_RECRUITMENT_CATEGORY_ID`
- `DISCORD_COUNCIL_ROLE_IDS`
- `REPOSITORY_PROVIDER`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_PORT`
- `APP_BASE_URL`
- `API_BASE_URL`

## Base de datos

- `supabase/migrations/20260301_001_initial_schema.sql`: esquema inicial alineado con el RFC.
- `supabase/policies/001_base_rls.sql`: primera aproximacion a RLS.
- `supabase/seeds/dev.sql`: datos base para desarrollo.
- `REPOSITORY_PROVIDER=memory|supabase`: cambia el backend de datos de la API sin tocar codigo.
- [supabase/README.md](/c:/Users/lahue/Desktop/TheHundred/supabase/README.md): pasos para activar el modo `supabase`.

## Auth API

- `GET /auth/discord/start`: construye la URL de autorizacion OAuth de Discord.
- `GET /auth/discord/callback?code=...`: intercambia el `code`, crea sesion efimera y redirige a la web.
- `GET /me`: acepta `th_session` o `x-session-token`.
- `GET /members`: lectura operacional protegida para `OFFICER` y `ADMIN`.
- `GET /health`: indica si la API esta viva y que backend de datos esta activo.

## Flujo actual

1. La home pide la URL de Discord OAuth a la API.
2. Discord vuelve a `apps/api` en `/auth/discord/callback`.
3. La API crea una sesion efimera `th_session` y redirige a `apps/web`.
4. Si el usuario no existe todavia, la web muestra el formulario de solicitud.
5. El formulario crea una `recruitment_application` persistente y no da acceso privado por si solo.
6. El bot abre un ticket de reclutamiento en Discord con la informacion del formulario.
7. Council asigna el rol Discord correcto y el bot crea o sincroniza el `GuildMember`.
8. El acceso privado solo se habilita cuando estado web y rol Discord coinciden.

## Recruitment

- El login web no consume slots.
- El dashboard privado requiere reclutamiento aprobado.
- El bot comparte el mismo backend que web y API.
- El comando `/recruit discord_id:<id>` crea el miembro inicial de guild y desbloquea acceso privado.
- El comando `/syncmember discord_id:<id>` sincroniza los roles de Discord con el estado web actual del miembro.
- El comando `/slots` del bot y la web leen la misma fuente de datos.
- El editor de `Comps` solo permite asignar jugadores `TRIAL`, `CORE` o `BENCHED` que ya esten sincronizados tambien en Discord.
- Las nuevas solicitudes web generan ticket automatico en Discord si el bot tiene configurada categoria y permisos.
