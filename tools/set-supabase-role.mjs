const [email, role = "admin"] = process.argv.slice(2);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!email) {
  fail("Uso: node tools/set-supabase-role.mjs usuario@email.com admin");
}

if (!supabaseUrl || !serviceRoleKey) {
  fail("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno.");
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json"
};

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.message || body?.error_description || text || response.statusText);
  }

  return body;
}

const users = await request(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
const user = users.users?.find((item) => item.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  fail(`No se encontro usuario con email ${email}.`);
}

const appMetadata = {
  ...(user.app_metadata || {}),
  role
};

const updated = await request(`/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  body: JSON.stringify({ app_metadata: appMetadata })
});

console.log(`Rol actualizado: ${updated.email} -> ${updated.app_metadata?.role}`);
