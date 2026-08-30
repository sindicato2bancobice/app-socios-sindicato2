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
