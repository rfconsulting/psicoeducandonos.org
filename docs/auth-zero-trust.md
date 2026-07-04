# Login seguro Zero Trust + MFA

Esta implementacion protege el panel `admin/` con Supabase Auth y MFA/TOTP desde HTML, CSS y JS.

## Archivos agregados

- `login.html`: formulario de email y contrasena.
- `mfa.html`: activacion/verificacion TOTP.
- `admin/index.html`: panel bloqueado por sesion, rol y MFA.
- `js/auth-config.js`: configuracion publica del proveedor.
- `js/auth.js`: cliente Auth, sesion, AAL, roles e inactividad.
- `js/login.js`: inicio de sesion.
- `js/mfa.js`: enrolamiento y verificacion MFA.
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

## Flujo

1. El usuario entra en `login.html`.
2. Supabase valida email y contrasena.
3. Si la sesion no esta en `aal2`, se redirige a `mfa.html`.
4. El usuario verifica TOTP.
5. `admin/index.html` vuelve a validar sesion, MFA, rol e inactividad.

## Limites importantes

HTML, CSS y JS no pueden proteger contenido sensible por si solos. Este flujo bloquea el panel en el navegador, pero cualquier dato privado debe vivir detras de Supabase con RLS, Edge Functions o un backend propio.

Para contenido realmente privado:

- Activa Row Level Security en tablas.
- Exige `aal2` en politicas o funciones sensibles.
- Registra eventos de auditoria en base de datos.
- No publiques archivos privados como HTML estatico.
