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


/*
 * =========================================================
 * ACI MODEL PRICE REGISTRY
 *
 * These are the same economics used by ACI routing.
 * Prices are USD per 1M tokens.
 * =========================================================
 */

const MODELS = {

  "gemini-3.5-flash-lite": {
    provider: "google",
    input: 0.30,
    output: 2.50
  },

  "gemini-3.7-flash": {
    provider: "google",
    input: 0.75,
    output: 3.75
  },

  "gemini-3.8-flash": {
    provider: "google",
    input: 0.75,
    output: 3.75
  },

  "gpt-5.6-luna": {
    provider: "openai",
    input: 0.20,
    output: 1.20
  },

  "gpt-5.6-terra": {
    provider: "openai",
    input: 2.00,
    output: 12.00
  },

  "gpt-5.6-sol": {
    provider: "openai",
    input: 4.00,
    output: 20.00
  }

};


/*
 * Designated enterprise baseline.
 *
 * ACI asks:
 *
 * "What would this request have cost if it
 * had gone through the designated baseline model?"
 *
 * This lets the dashboard show cost avoidance.
 */

const BASELINE_MODEL = "gpt-5.6-sol";


function calculateModelCost(
  modelName,
  inputTokens,
  outputTokens
) {

  const model =
    MODELS[modelName];

  if (!model) {
    return 0;
  }

  const inputCost =
    (Number(inputTokens || 0) / 1000000) *
    model.input;

  const outputCost =
    (Number(outputTokens || 0) / 1000000) *
    model.output;

  return (
    inputCost +
    outputCost
  );

}


/*
 * Fallback economics.
 *
 * Current ACI routing uses Gemini 3.8 as the
 * primary Gemini model and may fall back to
 * cheaper Gemini models.
 */

function calculateFallbackSavings(record) {

  if (
    record.fallback_used !== true
  ) {
    return 0;
  }

  const actualModel =
    record.model;

  if (
    !actualModel ||
    actualModel === "gemini-3.8-flash"
  ) {
    return 0;
  }

  const actualCost =
    Number(
      record.estimated_cost_usd || 0
    );

  const primaryCost =
    calculateModelCost(
      "gemini-3.8-flash",
      record.input_tokens,
      record.output_tokens
    );

  return Math.max(
    0,
    primaryCost - actualCost
  );

}


export default async function handler(
  req,
  res
) {

  /*
   * =======================================================
   * AUTH
   * =======================================================
   */

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

    /*
     * =====================================================
     * SUPABASE
     * =====================================================
     */

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
     * =====================================================
     * FX
     * =====================================================
     */

    let usdInr =
      95.60;

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

    } catch (error) {

      console.warn(
        "FX lookup failed:",
        error?.message
      );

    }


    /*
     * =====================================================
     * ENRICH EVERY REQUEST
     * =====================================================
     */

    const requests =
      Array.isArray(data)
        ? data.map(record => {

            const inputTokens =
              Number(
                record.input_tokens || 0
              );


            const outputTokens =
              Number(
                record.output_tokens || 0
              );


            const actualCost =
              Number(
                record.estimated_cost_usd || 0
              );


            /*
             * Calculate baseline independently
             * from the stored request tokens.
             */

            const baselineCost =
              calculateModelCost(
                BASELINE_MODEL,
                inputTokens,
                outputTokens
              );


            /*
             * Cost avoided.
             *
             * Never allow a negative saving.
             */

            const savings =
              Math.max(
                0,
                baselineCost -
                actualCost
              );


            const fallbackSavings =
              calculateFallbackSavings(
                record
              );


            return {

              ...record,

              baseline_model:
                BASELINE_MODEL,

              baseline_cost_usd:
                Number(
                  baselineCost.toFixed(8)
                ),

              savings_usd:
                Number(
                  savings.toFixed(8)
                ),

              fallback_savings_usd:
                Number(
                  fallbackSavings.toFixed(8)
                ),

              actual_cost_inr:
                Number(
                  (
                    actualCost *
                    usdInr
                  ).toFixed(4)
                ),

              baseline_cost_inr:
                Number(
                  (
                    baselineCost *
                    usdInr
                  ).toFixed(4)
                ),

              savings_inr:
                Number(
                  (
                    savings *
                    usdInr
                  ).toFixed(4)
                ),

              fallback_savings_inr:
                Number(
                  (
                    fallbackSavings *
                    usdInr
                  ).toFixed(4)
                )

            };

          })
        : [];


    /*
     * =====================================================
     * SUMMARY
     * =====================================================
     */

    const totalRequests =
      requests.length;


    const totalTokens =
      requests.reduce(
        (sum, r) =>
          sum +
          Number(
            r.total_tokens || 0
          ),
        0
      );


    const actualCostUSD =
      requests.reduce(
        (sum, r) =>
          sum +
          Number(
            r.estimated_cost_usd || 0
          ),
        0
      );


    const baselineCostUSD =
      requests.reduce(
        (sum, r) =>
          sum +
          Number(
            r.baseline_cost_usd || 0
          ),
        0
      );


    const savingsUSD =
      requests.reduce(
        (sum, r) =>
          sum +
          Number(
            r.savings_usd || 0
          ),
        0
      );


    const fallbackSavingsUSD =
      requests.reduce(
        (sum, r) =>
          sum +
          Number(
            r.fallback_savings_usd || 0
          ),
        0
      );


    const passed =
      requests.filter(
        r =>
          r.outcome === "PASS"
      ).length;


    const failed =
      requests.filter(
        r =>
          r.outcome === "FAIL"
      ).length;


    const fallbackEvents =
      requests.filter(
        r =>
          r.fallback_used === true
      ).length;


    const rescued =
      requests.filter(
        r =>
          r.fallback_used === true &&
          r.outcome === "PASS"
      ).length;


    const optimizationPercent =
      baselineCostUSD > 0
        ? (
            savingsUSD /
            baselineCostUSD *
            100
          )
        : 0;


    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return res.status(200).json({

      requests,

      summary: {

        totalRequests,

        totalTokens,

        actualCostUSD:
          Number(
            actualCostUSD.toFixed(8)
          ),

        baselineCostUSD:
          Number(
            baselineCostUSD.toFixed(8)
          ),

        savingsUSD:
          Number(
            savingsUSD.toFixed(8)
          ),

        fallbackSavingsUSD:
          Number(
            fallbackSavingsUSD.toFixed(8)
          ),

        passed,

        failed,

        successRate:
          totalRequests
            ? Number(
                (
                  passed /
                  totalRequests *
                  100
                ).toFixed(1)
              )
            : 0,

        fallbackEvents,

        rescued,

        optimizationPercent:
          Number(
            optimizationPercent.toFixed(1)
          )

      },

      fx: {

        usdInr:
          Number(
            usdInr.toFixed(4)
          ),

        date:
          new Date()
            .toISOString()
            .slice(0, 10),

        source:
          fxSource

      },

      economics: {

        baselineModel:
          BASELINE_MODEL,

        baselineDescription:
          "Estimated cost if requests had used the designated baseline model.",

        fallbackDescription:
          "Estimated additional cost avoided when ACI rescued a request using a fallback model."

      }

    });


  } catch (error) {

    console.error(
      "ACI admin error:",
      error
    );


    return res.status(500).json({

      error:
        error?.message ||
        "Admin query failed."

    });

  }

}
