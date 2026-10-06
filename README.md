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
con `directiva@sindicato2bancobice.cl`. No transmite RUT, fechas,
notas ni información laboral. El estado sindical se refleja en tres etiquetas de Google. Las eliminaciones confirmadas en la app se propagan a Google; las bajas confirmadas por consulta directa a Google se reflejan en la app. Los contactos sin ficha
no se convierten automáticamente en socios. La primera vinculación reutiliza un contacto sin vínculo cuando coinciden los cuatro campos. Las fichas nuevas se crean con un identificador externo propio, incluso si comparten correo. Los reintentos buscan ese identificador antes de crear. Después, una comparación con la última versión sincronizada combina
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
6. Aplica `supabase/migrations/20261006170943_contact_deletions.sql` antes de desplegar.
   `vercel.json` programa `GET /api/google/cron` una vez al día a las 09:00 UTC,
   compatible con Hobby. Vercel envía `Authorization: Bearer <CRON_SECRET>`.
   Configura ese secreto en producción; los cron solo se ejecutan en producción.
   La hora en Chile varía con el horario de verano y Hobby puede ejecutar dentro
   de la hora siguiente. Los cambios no son instantáneos.

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

## Eliminar contactos

Administradores y directores activos pueden eliminar desde la ficha, tras confirmar.
La transacción valida el rol y la versión de la ficha, registra el actor en auditoría,
elimina sus solicitudes (FK cascade) y desvincula su perfil (FK set null). No elimina
la cuenta de acceso. Para conservar el historial, usar estado Inactivo.

El recurso de Google se guarda en una cola privada antes de eliminar el vínculo.
La próxima sincronización procesa eliminaciones secuencialmente; una caída conserva
los pendientes. Las respuestas vacías y 404 permiten reintentos seguros. Se mantienen
las marcas de eliminación para impedir reimportaciones y vinculaciones por listados
obsoletos. Un contacto cuya baja confirma Google elimina también la ficha; se registra en auditoría y se conserva una marca de baja, sin enviar un DELETE al contacto sobreviviente.

Validar en un entorno de prueba antes de producción: aplicar la migración, eliminar
una ficha vinculada, comprobar auditoría, relaciones y cola; sincronizar y verificar
la eliminación en Google. Repetir con Google indisponible y con una edición concurrente.

## Etiquetas de estado en Google Contacts

La app/Supabase define el estado. En cada sincronización se crean o reutilizan
las etiquetas `Sindicato 2 · Socio activo`, `Sindicato 2 · Adherente` y
`Sindicato 2 · Inactivo`. Cada contacto vinculado recibe la etiqueta de su estado
y pierde las otras dos etiquetas sindicales, conservando las etiquetas ajenas.
Las etiquetas se procesan en lotes secuenciales de hasta 1000 contactos: se agrega
primero la correcta y luego se retiran las anteriores. Los errores parciales de
Google se reportan y pueden reintentarse.

Los inactivos también sincronizan sus datos de contacto y su etiqueta; no se borran
al cambiar de estado. Cambios manuales de etiquetas en Google no modifican el estado
en Supabase y se corrigen en la próxima sincronización. Los conflictos de datos
de contactos previamente vinculados no impiden actualizar su estado. No requiere
migración ni nuevos permisos OAuth (utiliza el alcance Contacts existente).

Validación en producción tras desplegar: cambiar una ficha vinculada a Adherente,
sincronizar y comprobar la etiqueta; repetir con Inactivo y Socio activo. Verificar
que una etiqueta personal adicional se conserva y repetir sin cambios.

## Bajas y fusiones originadas en Google

Aplicar `20261006183441_google_remote_reconciliation.sql` antes de desplegar.
La consulta por lotes distingue NOT_FOUND explícito de una respuesta incompleta
o un error de autorización/cuota. Solo la baja confirmada permite retirar una ficha.
Una lista que todavía incluye el recurso contradice la baja y obliga a reintentar.
Si Google devuelve otro recurso, se actualiza el vínculo; si ya pertenece a otra
ficha, se retira únicamente la ficha duplicada. Los vínculos y fichas se actualizan
en una transacción con control de versión y bloqueo. La auditoría conserva el
registro previo y la referencia al sobreviviente. Solicitudes y vínculos de una
ficha retirada se eliminan por FK; el perfil pierde su asociación sin borrar Auth.

Las altas nuevas incluyen `externalIds` con el UUID de la ficha, sin RUT ni datos
laborales. Correos compartidos no provocan vinculación a otra persona ni bloquean
la creación. Identificadores externos duplicados requieren revisión.

## Correos completos y direcciones de Google

Aplicar `20261006185939_google_contact_details.sql` antes de desplegar. La importación
conserva todos los correos con sus etiquetas y todas las direcciones. Las fichas ya
vinculadas se completan al pulsar Sincronizar ahora. `null` significa pendiente de
carga; una lista vacía significa que Google no tiene datos en ese campo.

En la ficha se pueden editar, agregar y quitar correos y etiquetas personalizadas.
El guardado valida la lista y actualiza el correo principal compatible con el
registro anterior. La sincronización compara la lista completa con la última
versión: cambios simultáneos diferentes se bloquean para revisión; cambios de
orden o metadatos de presentación no generan conflictos. Al actualizar Google,
solo se envían los campos editables de los correos y se conservan los otros campos
del contacto. La migración de fichas antiguas no descarta correos secundarios.
La búsqueda del directorio también incluye los correos secundarios.

Las direcciones se muestran con etiqueta original, texto formateado, calle,
complemento, casilla postal, ciudad/localidad, región, código postal, país y código
de país cuando Google los provee. Son de consulta: se actualizan desde Google y
no se clasifican automáticamente como ubicación laboral. El filtro por zona de
trabajo queda para una etapa posterior.

Validación después del despliegue: sincronizar una ficha con varios correos y
etiquetas personalizadas y con dos direcciones; revisar todos los datos en la app.
Editar un correo secundario, sincronizar y verificarlo en Google; luego probar
agregar/quitar uno y comprobar que se mantienen los restantes y las direcciones.
