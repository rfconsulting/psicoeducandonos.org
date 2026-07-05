# Login seguro Zero Trust + MFA

Esta implementacion protege el panel `admin/` con Supabase Auth y MFA/TOTP desde HTML, CSS y JS.

## Archivos agregados

- `login.html`: formulario de email y contrasena.
- `mfa.html`: activacion/verificacion TOTP.
- `reset-password.html`: recepcion del enlace de recuperacion y cambio de contrasena.
- `admin/index.html`: panel bloqueado por sesion, rol y MFA.
- `js/auth-config.js`: configuracion publica del proveedor.
- `js/auth.js`: cliente Auth, sesion, AAL, roles e inactividad.
- `js/login.js`: inicio de sesion.
- `js/mfa.js`: enrolamiento y verificacion MFA.
- `js/reset-password.js`: recuperacion de contrasena con token temporal.
- `js/admin.js`: guard del panel.
- `css/auth.css`: estilos del flujo seguro.

## Configuracion requerida

1. Crea un proyecto en Supabase.
2. En Auth, habilita email/password.
3. En Auth MFA, habilita TOTP.
4. Copia la Project URL y anon public key.
5. Edita `js/auth-config.js`:

```js
window.PSICO_AUTH_CONFIG = {
  provider: "supabase",
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU_SUPABASE_ANON_KEY",
  requiredAal: "aal2",
  idleTimeoutMinutes: 20,
  loginPath: "/login.html",
  mfaPath: "/mfa.html",
  resetPasswordPath: "/reset-password.html",
  adminPath: "/admin/",
  allowedRoles: ["admin", "editor"]
};
```

La anon key de Supabase es publica. No agregues service role keys ni secretos privados al frontend.

## Roles

El guard permite usuarios con `app_metadata.role` o `user_metadata.role` igual a:

- `admin`
- `editor`

Para maxima seguridad, asigna roles desde un entorno administrativo seguro. No permitas que el usuario final edite su propio rol.

Si el dashboard de Supabase no permite editar metadata, usa la Admin API desde consola local:

```powershell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
node tools/set-supabase-role.mjs usuario@email.com admin
```

La `service_role key` nunca debe guardarse en archivos del frontend ni subirse a Git.

## Flujo

1. El usuario entra en `login.html`.
2. Supabase valida email y contrasena.
3. Si la sesion no esta en `aal2`, se redirige a `mfa.html`.
4. El usuario verifica TOTP.
5. `admin/index.html` vuelve a validar sesion, MFA, rol e inactividad.

## Recuperacion de contrasena

En Supabase, configura las URL permitidas para que el enlace no caiga en un puerto sin servidor:

- Desarrollo: `http://localhost:3000/reset-password.html`
- Alternativa local: `http://127.0.0.1:3000/reset-password.html`
- Produccion: `https://TU-DOMINIO/reset-password.html`

Tambien puedes usar el boton "Enviar enlace de recuperacion" en `login.html`; ese flujo ya envia `redirectTo` hacia `reset-password.html`.

## Limites importantes

HTML, CSS y JS no pueden proteger contenido sensible por si solos. Este flujo bloquea el panel en el navegador, pero cualquier dato privado debe vivir detras de Supabase con RLS, Edge Functions o un backend propio.

Para contenido realmente privado:

- Activa Row Level Security en tablas.
- Exige `aal2` en politicas o funciones sensibles.
- Registra eventos de auditoria en base de datos.
- No publiques archivos privados como HTML estatico.
