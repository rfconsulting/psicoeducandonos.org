import { authConfig, clearStatus, getCurrentSession, getSupabaseClient, setStatus } from "./auth.js";

const form = document.querySelector("[data-reset-password-form]");
const statusEl = document.querySelector("[data-auth-status]");
const submit = form?.querySelector("button[type='submit']");

async function ensureRecoverySession() {
  if (!authConfig.isConfigured()) {
    setStatus(statusEl, "Autenticacion pendiente: configura js/auth-config.js.", "error");
    if (submit) submit.disabled = true;
    return;
  }

  try {
    const { session } = await getCurrentSession();
    if (!session) {
      setStatus(statusEl, "El enlace no tiene una sesion valida. Solicita un nuevo enlace de recuperacion.", "error");
      if (submit) submit.disabled = true;
      return;
    }

    setStatus(statusEl, "Enlace validado. Escribe tu nueva contrasena.", "success");
  } catch (error) {
    setStatus(statusEl, "No se pudo validar el enlace de recuperacion.", "error");
    if (submit) submit.disabled = true;
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus(statusEl);

  const data = new FormData(form);
  const password = String(data.get("password") || "");
  const confirmPassword = String(data.get("confirmPassword") || "");

  if (password.length < 12) {
    setStatus(statusEl, "Usa una contrasena de al menos 12 caracteres.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setStatus(statusEl, "Las contrasenas no coinciden.", "error");
    return;
  }

  submit.disabled = true;
  submit.textContent = "Actualizando...";

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    await supabase.auth.signOut();
    setStatus(statusEl, "Contrasena actualizada. Ya puedes iniciar sesion.", "success");
    setTimeout(() => location.replace(authConfig.loginPath), 1800);
  } catch (error) {
    setStatus(statusEl, "No se pudo actualizar la contrasena. Solicita un enlace nuevo.", "error");
    submit.disabled = false;
    submit.textContent = "Actualizar contrasena";
  }
});

ensureRecoverySession();
