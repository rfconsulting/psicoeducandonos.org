const CONFIG = window.PSICO_AUTH_CONFIG || {};
const ACTIVITY_KEY = "psico.lastActivityAt";
let supabaseClient = null;

function getBasePath(path) {
  if (location.protocol === "file:") {
    const root = location.pathname.includes("/admin/") ? "../" : "./";
    return root + path.replace(/^\//, "");
  }
  return path;
}

function isConfigured() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
}

function makeStorage() {
  return {
    getItem: (key) => sessionStorage.getItem(key),
    setItem: (key, value) => sessionStorage.setItem(key, value),
    removeItem: (key) => sessionStorage.removeItem(key)
  };
}

export const authConfig = {
  requiredAal: CONFIG.requiredAal || "aal2",
  idleTimeoutMinutes: Number(CONFIG.idleTimeoutMinutes || 20),
  loginPath: getBasePath(CONFIG.loginPath || "/login.html"),
  mfaPath: getBasePath(CONFIG.mfaPath || "/mfa.html"),
  adminPath: getBasePath(CONFIG.adminPath || "/admin/"),
  allowedRoles: CONFIG.allowedRoles || ["admin", "editor"],
  isConfigured
};

export async function getSupabaseClient() {
  if (!isConfigured()) return null;
  if (supabaseClient) return supabaseClient;

  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  supabaseClient = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: makeStorage()
      }
    });

  return supabaseClient;
}

export function setStatus(target, message, type = "info") {
  if (!target) return;
  target.textContent = message;
  target.dataset.type = type;
  target.hidden = false;
}

export function clearStatus(target) {
  if (!target) return;
  target.textContent = "";
  target.hidden = true;
}

export function touchActivity() {
  sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function hasIdleExpired() {
  const last = Number(sessionStorage.getItem(ACTIVITY_KEY) || Date.now());
  const maxIdle = authConfig.idleTimeoutMinutes * 60 * 1000;
  return Date.now() - last > maxIdle;
}

export function bindActivityTracking() {
  ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, touchActivity, { passive: true });
  });
  touchActivity();
}

export async function signOutAndRedirect(reason) {
  const supabase = await getSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  sessionStorage.clear();
  const url = new URL(authConfig.loginPath, location.href);
  if (reason) url.searchParams.set("reason", reason);
  location.replace(url.toString());
}

export async function getCurrentSession() {
  const supabase = await getSupabaseClient();
  if (!supabase) return { session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return {
    session: data.session,
    user: data.session?.user || null
  };
}

export async function getAssuranceLevel() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}

export function userHasAllowedRole(user) {
  const role = user?.app_metadata?.role || user?.user_metadata?.role;
  return authConfig.allowedRoles.includes(role);
}

export async function requireAdminSession() {
  if (!isConfigured()) {
    return { ok: false, reason: "not-configured" };
  }

  if (hasIdleExpired()) {
    await signOutAndRedirect("idle");
    return { ok: false, reason: "idle" };
  }

  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    location.replace(authConfig.loginPath);
    return { ok: false, reason: "missing-session" };
  }

  const assurance = await getAssuranceLevel();
  if (authConfig.requiredAal === "aal2" && assurance?.currentLevel !== "aal2") {
    location.replace(authConfig.mfaPath);
    return { ok: false, reason: "mfa-required" };
  }

  if (!userHasAllowedRole(user)) {
    await signOutAndRedirect("role");
    return { ok: false, reason: "role" };
  }

  touchActivity();
  return { ok: true, session, user, assurance };
}
