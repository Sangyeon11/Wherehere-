function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

function errorResponse(status, code, title, message, tips = []) {
  return json(
    {
      code,
      title,
      message,
      tips
    },
    { status }
  );
}

function getSupabaseConfig(context) {
  const url = context.env.SUPABASE_URL;
  const serviceRoleKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey
  };
}

async function supabaseRequest(context, path, init = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig(context);
  const headers = new Headers(init.headers || {});
  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", "Bearer " + serviceRoleKey);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.message || data.error_description || data.error || data.hint)) ||
      "Supabase request failed";
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export {
  json,
  errorResponse,
  getSupabaseConfig,
  supabaseRequest
};
