function authorized(req) {
  const auth = req.headers.authorization || "";

  const token =
    auth.startsWith("Bearer ")
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


  const url =
    process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;


  if (!url || !key) {
    return res.status(500).json({
      error:
        "Supabase is not configured."
    });
  }


  try {

    const response =
      await fetch(
        `${url}/rest/v1/aci_requests?select=*&order=created_at.desc&limit=500`,
        {
          headers: {
            apikey: key,
            Authorization:
              `Bearer ${key}`
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      return res.status(
        response.status
      ).json({
        error: data
      });
    }


    /*
     * Current market FX valuation.
     *
     * The dashboard uses this only to translate
     * existing USD AI economics into INR.
     */

    let usdInr = 95.60;

    let fxSource =
      "Fallback reference rate";

    try {

      const fxResponse =
        await fetch(
          "https://open.er-api.com/v6/latest/USD"
        );

      const fx =
        await fxResponse.json();

      if (
        fx?.result === "success" &&
        Number(fx?.rates?.INR) > 0
      ) {

        usdInr =
          Number(
            fx.rates.INR
          );

        fxSource =
          "Live USD/INR market reference";

      }

    } catch (fxError) {

      console.warn(
        "FX lookup failed:",
        fxError?.message
      );

    }


    return res.status(200).json({

      requests:
        Array.isArray(data)
          ? data
          : [],

      fx: {

        usdInr,

        date:
          new Date()
            .toISOString()
            .slice(0, 10),

        source:
          fxSource

      }

    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({

      error:
        error?.message ||
        "Admin query failed."

    });

  }
}
