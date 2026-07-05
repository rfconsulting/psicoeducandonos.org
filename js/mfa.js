import { authConfig, clearStatus, getCurrentSession, getSupabaseClient, setStatus, touchActivity } from "./auth.js";

const verifyForm = document.querySelector("[data-mfa-verify]");
const enrollForm = document.querySelector("[data-mfa-enroll]");
const setupPanel = document.querySelector("[data-mfa-setup]");
const verifyPanel = document.querySelector("[data-mfa-panel]");
const statusEl = document.querySelector("[data-auth-status]");
const qrTarget = document.querySelector("[data-mfa-qr]");
const factorSelect = document.querySelector("[data-factor-id]");
const enrollButton = document.querySelector("[data-start-enroll]");

let enrollment = null;
let supabase = null;
let factors = { totp: [] };

function formatSupabaseError(error, fallback) {
  const detail = error?.message || error?.error_description || error?.name || "";
  const status = error?.status ? ` (${error.status})` : "";
  return detail ? `${fallback} Detalle: ${detail}${status}` : fallback;
}

async function ensureSession() {
  if (!authConfig.isConfigured()) {
    setStatus(statusEl, "Autenticacion pendiente: configura js/auth-config.js.", "error");
    return false;
  }

  const { session } = await getCurrentSession();
  if (!session) {
    location.replace(authConfig.loginPath);
    return false;
  }

  return true;
}

async function loadFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  factors = data;

  const verifiedTotp = data.totp.filter((factor) => factor.status === "verified");
  factorSelect.innerHTML = "";

  verifiedTotp.forEach((factor) => {
    const option = document.createElement("option");
    option.value = factor.id;
    option.textContent = factor.friendly_name || "Autenticador";
    factorSelect.append(option);
  });

  verifyPanel.hidden = verifiedTotp.length === 0;
  setupPanel.hidden = verifiedTotp.length > 0;
}

async function enrollTotp() {
  clearStatus(statusEl);

  const unverifiedTotp = factors.totp.filter((factor) => factor.status !== "verified");
  for (const factor of unverifiedTotp) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Psicoeducandonos Admin"
  });
  if (error) throw error;

  enrollment = data;
  qrTarget.innerHTML = "";

  const qrImage = document.createElement("img");
  qrImage.src = data.totp.qr_code;
  qrImage.alt = "Codigo QR para activar 2FA";
  qrImage.loading = "eager";
  qrTarget.append(qrImage);

  setupPanel.hidden = false;
  setStatus(statusEl, "Escanea el QR y confirma el codigo de 6 digitos.", "info");
}

async function verifyFactor(factorId, code, challengeId) {
  const challenge = challengeId
    ? { id: challengeId }
    : (await supabase.auth.mfa.challenge({ factorId })).data;

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code
  });

  if (error) throw error;
  touchActivity();
  location.assign(authConfig.adminPath);
}

document.querySelector("[data-start-enroll]")?.addEventListener("click", async () => {
  try {
    enrollButton.disabled = true;
    enrollButton.textContent = "Creando QR...";
    await enrollTotp();
  } catch (error) {
    setStatus(statusEl, formatSupabaseError(error, "No se pudo iniciar la activacion MFA."), "error");
    enrollButton.disabled = false;
    enrollButton.textContent = "Activar autenticador";
  }
});

enrollForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = String(new FormData(enrollForm).get("code") || "").trim();
  try {
    await verifyFactor(enrollment.id, code);
  } catch (error) {
    setStatus(statusEl, formatSupabaseError(error, "Codigo MFA invalido o expirado."), "error");
  }
});

verifyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = String(new FormData(verifyForm).get("code") || "").trim();
  const factorId = factorSelect.value;

  try {
    await verifyFactor(factorId, code);
  } catch (error) {
    setStatus(statusEl, formatSupabaseError(error, "Codigo MFA invalido o expirado."), "error");
  }
});

try {
  const ready = await ensureSession();
  if (ready) {
    supabase = await getSupabaseClient();
    await loadFactors();
  }
} catch (error) {
  setStatus(statusEl, formatSupabaseError(error, "No se pudo cargar la verificacion MFA."), "error");
}
