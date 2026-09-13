function authorized(req) {
  const auth = req.headers.authorization || "";

  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : "";

  return (
    token &&
    process.env.ADMIN_TOKEN &&
    token === process.env.ADMIN_TOKEN
  );
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET only"
    });
  }

  const url = process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({
      error: "Supabase is not configured."
    });
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/aci_requests?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data
      });
    }

    return res.status(200).json({
      requests: data
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error?.message || "Admin query failed."
    });
  }
}
