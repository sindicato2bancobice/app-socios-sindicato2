# App Socios — Sindicato N°2 Banco BICE

Aplicación web progresiva para administrar socios, adherentes y solicitudes de actualización de datos.

## Primera versión

- Inicio de sesión con Supabase Auth.
- Panel con socios activos, adherentes, cumpleaños y solicitudes pendientes.
- Directorio con búsqueda y filtros.
- Registro de información personal, laboral y sindical.
- Portal individual del socio y solicitudes de corrección.
- Roles `administrator`, `director`, `collaborator` y `member` protegidos por RLS.
- Registro automático de auditoría para cambios en socios.

## Stack

- Next.js + TypeScript
- Supabase Auth y PostgreSQL con RLS
- Google People API (siguiente iteración)
- PWA instalable en Android

## Desarrollo local

1. Copia `.env.example` a `.env.local`.
2. Completa la clave publicable de Supabase. Nunca agregues una clave secreta al repositorio.
3. Ejecuta `npm install` y luego `npm run dev`.

La primera cuenta creada recibe el rol `member`. Para habilitar al administrador inicial, crea el usuario en Supabase Auth y actualiza su perfil desde el SQL Editor:

```sql
update public.profiles
set role = 'administrator', display_name = 'Nombre del administrador'
where id = (select id from auth.users where email = 'correo@ejemplo.cl');
```

## Seguridad

Todas las tablas expuestas tienen RLS. Los socios solo pueden ver su ficha y enviar solicitudes; la modificación directa queda reservada a la directiva. Los datos sindicales no se copian a Google Contacts.

## Google Contacts (configuración pendiente)

La integración sincroniza nombre, apellidos, correo y teléfono de fichas existentes
con `directiva@sindicato2bancobice.cl`. No transmite RUT, fechas, estado sindical,
notas ni información laboral. No borra fichas o contactos. Los contactos sin ficha
no se convierten automáticamente en socios. Para la primera vinculación, el correo
debe ser único y los cuatro campos deben coincidir; las diferencias se muestran
para revisión. Después, una comparación con la última versión sincronizada combina
cambios independientes y bloquea conflictos en el mismo campo.

1. Aplica `supabase/migrations/202610050001_google_contacts.sql`.
2. En Google Cloud activa People API y crea un cliente OAuth de tipo aplicación web.
   Configura el consentimiento para la cuenta del sindicato y el alcance Contacts.
3. Agrega esta URI de redirección autorizada:
   `https://app-socios-sindicato2.vercel.app/api/google/callback`.
4. Configura en Vercel (solo servidor) `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_TOKEN_ENCRYPTION_KEY`
   (32 bytes aleatorios codificados en base64) y `CRON_SECRET` (secreto aleatorio).
   Nunca pegues estos secretos en el chat o el repositorio.
5. Despliega y, como administrador, abre Google Contacts → Conectar Google.
   Autoriza exclusivamente la cuenta del sindicato. Pulsa Sincronizar ahora y
   verifica el contacto de prueba en ambos sistemas.
6. Para sincronización periódica configura un programador que invoque
   `GET /api/google/cron` con `Authorization: Bearer <CRON_SECRET>`.
   El programador aún no está configurado. Los cambios no son instantáneos.

Los tokens se cifran con AES-256-GCM y las tablas de credenciales, vínculos y bloqueo
solo permiten acceso al servidor. No cambies la clave de cifrado sin volver a conectar.
Las mutaciones de Google se ejecutan secuencialmente y respetan sus etags. Ante error
se conserva el vínculo para permitir reintentos. Un bloqueo evita ejecuciones paralelas.
Esta primera versión lee todas las páginas de contactos; en directorios grandes hace
falta ajustar el tiempo de ejecución o mover el trabajo a una cola antes de programarlo.

Validación local: `npm run typecheck`, `npm run lint`, `npm run build` y
`node --experimental-strip-types --test tests/google-merge.test.ts`.

## Importar el directorio de socios de Google

Aplica también `202610050002_google_import.sql`. En Google Contacts pulsa
**Importar próximos 25 socios** y repite hasta que no queden pendientes.
Todos los contactos nuevos se registran como socios activos por decisión de la
directiva. No se inventan apellidos, RUT ni fechas. Los contactos sin nombre se
omiten; las coincidencias por recurso, correo o teléfono previenen duplicados.
Los datos diferentes en una ficha existente se conservan para revisión.

Cada inserción crea ficha y vínculo en una transacción; reintentar conserva las
fichas ya importadas. En Personas, pulsa el nombre para editar. El guardado usa
control de versión para no sobrescribir una edición o sincronización concurrente.
Los cambios de nombre, correo y teléfono se envían con Sincronizar ahora.
