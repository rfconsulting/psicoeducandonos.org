import { authConfig, clearStatus, getSupabaseClient, setStatus, touchActivity } from "./auth.js";

const form = document.querySelector("[data-login-form]");
const statusEl = document.querySelector("[data-auth-status]");
const submit = form?.querySelector("button[type='submit']");

const reasonMessages = {
  idle: "La sesion expiro por inactividad. Inicia sesion nuevamente.",
  role: "Tu usuario no tiene permisos para entrar al panel.",
  logout: "Sesion cerrada correctamente."
};

const reason = new URLSearchParams(location.search).get("reason");
if (reasonMessages[reason]) {
  setStatus(statusEl, reasonMessages[reason], reason === "role" ? "error" : "info");
}

if (!authConfig.isConfigured()) {
  setStatus(
    statusEl,
    "Autenticacion pendiente: configura js/auth-config.js con Supabase URL y anon key.",
    "error"
  );
  if (submit) submit.disabled = true;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus(statusEl);
  submit.disabled = true;
  submit.textContent = "Verificando...";

  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    touchActivity();

    const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;

    location.assign(data.currentLevel === "aal2" ? authConfig.adminPath : authConfig.mfaPath);
  } catch (error) {
    setStatus(statusEl, "No pudimos validar tus credenciales. Revisa los datos e intenta otra vez.", "error");
    submit.disabled = false;
    submit.textContent = "Entrar";
  }
});
