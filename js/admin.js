import { bindActivityTracking, requireAdminSession, signOutAndRedirect } from "./auth.js";

const gate = document.querySelector("[data-admin-gate]");
const shell = document.querySelector("[data-admin-shell]");
const userEmail = document.querySelector("[data-user-email]");
const userRole = document.querySelector("[data-user-role]");
const sessionLevel = document.querySelector("[data-session-level]");

bindActivityTracking();

document.querySelector("[data-logout]")?.addEventListener("click", () => {
  signOutAndRedirect("logout");
});

const result = await requireAdminSession();

if (result.ok) {
  gate.hidden = true;
  shell.hidden = false;
  userEmail.textContent = result.user.email || "Usuario";
  userRole.textContent = result.user.app_metadata?.role || result.user.user_metadata?.role || "sin rol";
  sessionLevel.textContent = result.assurance?.currentLevel || "aal1";
} else if (result.reason === "not-configured") {
  gate.innerHTML = `
    <h1>Autenticacion no configurada</h1>
    <p>Completa <code>js/auth-config.js</code> con tu Supabase URL y anon key. El panel permanece bloqueado hasta conectar el proveedor real.</p>
  `;
}
