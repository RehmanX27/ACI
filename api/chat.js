import OpenAI from "openai";

/*
===========================================================
ACI - AI CONSUMPTION INTELLIGENCE
Multi-model routing + fallback + economics logging
===========================================================
*/

/* =========================================================
   MODEL REGISTRY
   ========================================================= */

const MODELS = {
  gemini_flash: {
    provider: "google",
    id: "gemini-3.8-flash",
    tier: "advanced",
    inputPerMillion: 0.75,
    outputPerMillion: 3.75
  },

  gemini_balanced: {
    provider: "google",
    id: "gemini-3.7-flash",
    tier: "balanced",
    inputPerMillion: 0.75,
    outputPerMillion: 3.75
  },

  gemini_efficient: {
    provider: "google",
    id: "gemini-3.5-flash-lite",
    tier: "efficient",
    inputPerMillion: 0.30,
    outputPerMillion: 2.50
  },

  /*
   * OpenAI models are retained for future multi-provider routing.
   * They are NOT used by default while your OpenAI credits are exhausted.
   */

  openai_luna: {
    provider: "openai",
    id: "gpt-5.6-luna",
    tier: "efficient",
    inputPerMillion: 0.20,
    outputPerMillion: 1.20
  },

  openai_terra: {
    provider: "openai",
    id: "gpt-5.6-terra",
    tier: "balanced",
    inputPerMillion: 2.00,
    outputPerMillion: 12.00
  },

  openai_sol: {
    provider: "openai",
    id: "gpt-5.6-sol",
    tier: "frontier",
    inputPerMillion: 4.00,
    outputPerMillion: 20.00
  }
};


/* =========================================================
   TASK CLASSIFICATION
   ========================================================= */

function classify(text) {
  const t = text.toLowerCase();

  if (
    /production|outage|incident|root cause|architecture|critical/.test(t)
  ) {
    return "Production / Technical";
  }

  if (
    /debug|bug|error|python|javascript|java|sql|code|api/.test(t)
  ) {
    return "Coding / Technical";
  }

  if (
    /contract|legal|clause|liability|indemnity|compliance/.test(t)
  ) {
    return "Document / Legal";
  }

  if (
    /email|mail|reply|response|client|manager|draft/.test(t)
  ) {
    return "Email / Communication";
  }

  if (
    /meeting|transcript|minutes|conversation|chat|action items/.test(t)
  ) {
    return "Meeting / Conversation";
  }

  if (
    /summarize|summarise|summary|extract/.test(t)
  ) {
    return "Summarization / Extraction";
  }

  if (
    /research|competitor|market|compare|investigate/.test(t)
  ) {
    return "Research / Analysis";
  }

  if (
    /revenue|profit|margin|financial|forecast|cash flow/.test(t)
  ) {
    return "Business / Financial Analysis";
  }

  return "General Assistance";
}


/* =========================================================
   REQUEST INTELLIGENCE
   ========================================================= */

function intelligence(text) {
  const taskType = classify(text);

  let complexity = 1;

  if (text.length > 500) {
    complexity++;
  }

  if (text.length > 1500) {
    complexity++;
  }

  if (
    /analyze|analyse|investigate|compare|evaluate|reason|strategy|architecture|design/i.test(
      text
    )
  ) {
    complexity++;
  }

  if (
    /production|incident|contract|legal|financial|security|critical/i.test(
      text
    )
  ) {
    complexity++;
  }

  complexity = Math.min(5, complexity);


  let sensitivity = "Low";

  if (
    /password|credential|secret|api key|token|salary|bank|credit card|medical|patient/i.test(
      text
    )
  ) {
    sensitivity = "High";
  } else if (
    /client|customer|employee|internal|company|business|contract|financial/i.test(
      text
    )
  ) {
    sensitivity = "Medium";
  }


  const requiredQuality = Math.min(
    96,
    76 +
      complexity * 3 +
      (sensitivity === "Medium" ? 2 : 0) +
      (sensitivity === "High" ? 5 : 0)
  );


  return {
    taskType,
    complexity,
    sensitivity,
    requiredQuality
  };
}


/* =========================================================
   MODEL ROUTER
   ========================================================= */

function chooseModel(profile) {

  /*
   * Important:
   *
   * This is an initial routing policy.
   * It does NOT claim that one model is objectively better.
   *
   * ACI will eventually replace these heuristics with
   * measured quality, cost, latency and availability data.
   */


  // High complexity
  if (
    profile.complexity >= 4 ||
    profile.taskType === "Production / Technical"
  ) {
    return {
      model: MODELS.gemini_flash,
      reason: "High-complexity task routed to advanced Gemini model"
    };
  }


  // Medium complexity
  if (
    profile.complexity >= 3 ||
    profile.requiredQuality >= 88
  ) {
    return {
      model: MODELS.gemini_balanced,
      reason: "Medium-complexity task routed to balanced Gemini model"
    };
  }


  // Low complexity
  return {
    model: MODELS.gemini_efficient,
    reason: "Low-complexity task routed to efficient Gemini model"
  };
}


/* =========================================================
   GEMINI API
   ========================================================= */

async function callGemini(model, system, prompt) {

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured in Vercel."
    );
  }


  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },

      body: JSON.stringify({
        model: model.id,

        system_instruction: system,

        input: prompt,

        /*
         * Do not retain the Gemini interaction itself.
         * ACI controls its own optional logging separately.
         */
        store: false
      })
    }
  );


  const data = await response.json();


  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `Gemini API request failed with status ${response.status}.`
    );
  }


  let answer = "";


  /*
   * Current Gemini Interactions API format:
   *
   * data.steps[]
   *    -> type: model_output
   *    -> content[]
   *       -> type: text
   *       -> text
   */

  if (Array.isArray(data.steps)) {

    for (const step of data.steps) {

      if (
        step.type !== "model_output" ||
        !Array.isArray(step.content)
      ) {
        continue;
      }


      for (const content of step.content) {

        if (
          content.type === "text" &&
          typeof content.text === "string"
        ) {
          answer += content.text;
        }
      }
    }
  }


  /*
   * Compatibility fallback in case Google returns
   * output_text in a different response format.
   */

  if (
    !answer &&
    typeof data.output_text === "string"
  ) {
    answer = data.output_text;
  }


  if (!answer) {
    throw new Error(
      "Gemini returned no usable text output."
    );
  }


  const usage = data.usage || {};


  return {

    answer,

    usage: {

      input_tokens:
        usage.total_input_tokens || 0,

      output_tokens:
        usage.total_output_tokens || 0,

      total_tokens:
        usage.total_tokens || 0
    }
  };
}


/* =========================================================
   GEMINI FALLBACK ENGINE
   ========================================================= */

async function callGeminiWithFallback(
  primaryModel,
  system,
  prompt
) {

  /*
   * Primary model comes from the router.
   *
   * Fallback chain:
   *
   * Primary
   * ↓
   * Gemini 3.8 Flash
   * ↓
   * Gemini 3.7 Flash
   * ↓
   * Gemini 3.5 Flash-Lite
   *
   * Duplicate models are removed automatically.
   */

  const candidates = [

    primaryModel,

    MODELS.gemini_flash,

    MODELS.gemini_balanced,

    MODELS.gemini_efficient

  ].filter(
    (model, index, array) =>
      array.findIndex(
        x => x.id === model.id
      ) === index
  );


  let lastError = null;


  for (const model of candidates) {

    try {

      console.log(
        `ACI attempting model: ${model.provider}/${model.id}`
      );


      const result = await callGemini(
        model,
        system,
        prompt
      );


      const fallbackUsed =
        model.id !== primaryModel.id;


      if (fallbackUsed) {

        console.log(
          `ACI fallback succeeded: ${primaryModel.id} -> ${model.id}`
        );
      }


      return {

        ...result,

        selectedModel: model,

        fallbackUsed

      };

    } catch (error) {

      lastError = error;


      console.error(
        `ACI model failed: ${model.id}`,
        error?.message
      );
    }
  }


  throw new Error(
    lastError?.message ||
    "All approved Gemini models failed."
  );
}


/* =========================================================
   OPENAI API
   ========================================================= */

async function callOpenAI(
  model,
  system,
  prompt
) {

  if (!process.env.OPENAI_API_KEY) {

    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }


  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });


  const response =
    await client.responses.create({

      model: model.id,

      instructions: system,

      input: prompt

    });


  return {

    answer:
      response.output_text || "",

    usage: {

      input_tokens:
        response.usage?.input_tokens || 0,

      output_tokens:
        response.usage?.output_tokens || 0,

      total_tokens:
        response.usage?.total_tokens || 0
    }
  };
}


/* =========================================================
   MODEL EXECUTION
   ========================================================= */

async function executeModel(
  model,
  system,
  prompt
) {

  /*
   * Gemini is currently the active provider.
   *
   * OpenAI remains available in the registry for
   * future multi-provider routing.
   */

  if (model.provider === "google") {

    return await callGeminiWithFallback(
      model,
      system,
      prompt
    );
  }


  if (model.provider === "openai") {

    const result =
      await callOpenAI(
        model,
        system,
        prompt
      );


    return {

      ...result,

      selectedModel: model,

      fallbackUsed: false

    };
  }


  throw new Error(
    `Unsupported provider: ${model.provider}`
  );
}


/* =========================================================
   COST CALCULATOR
   ========================================================= */

function calculateCost(
  model,
  usage
) {

  const inputTokens =
    usage?.input_tokens || 0;

  const outputTokens =
    usage?.output_tokens || 0;


  const inputCost =
    (inputTokens / 1_000_000) *
    model.inputPerMillion;


  const outputCost =
    (outputTokens / 1_000_000) *
    model.outputPerMillion;


  return Number(
    (inputCost + outputCost).toFixed(8)
  );
}


/* =========================================================
   SUPABASE LOGGER
   ========================================================= */

async function saveLog(record) {

  const url =
    process.env.SUPABASE_URL;


  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;


  if (!url || !key) {

    console.warn(
      "Supabase logging not configured."
    );

    return;
  }


  try {

    const response =
      await fetch(
        `${url}/rest/v1/aci_requests`,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "apikey":
              key,

            "Authorization":
              `Bearer ${key}`,

            "Prefer":
              "return=minimal"

          },

          body:
            JSON.stringify(record)
        }
      );


    if (!response.ok) {

      console.error(
        "Supabase logging failed:",
        await response.text()
      );
    }

  } catch (error) {

    console.error(
      "Database logging failed:",
      error
    );
  }
}


/* =========================================================
   MAIN API HANDLER
   ========================================================= */

export default async function handler(
  req,
  res
) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "POST only"
    });
  }


  let requestId = null;

  let profile = null;

  let routing = null;

  let model = null;

  let started = Date.now();


  try {

    /* -----------------------------------------------------
       READ REQUEST
       ----------------------------------------------------- */

    const { prompt } =
      req.body || {};


    if (
      !prompt ||
      typeof prompt !== "string"
    ) {

      return res.status(400).json({
        error: "A prompt is required."
      });
    }


    /* -----------------------------------------------------
       REQUEST ID
       ----------------------------------------------------- */

    requestId =
      `ACI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;


    /* -----------------------------------------------------
       INTELLIGENCE
       ----------------------------------------------------- */

    profile =
      intelligence(prompt);


    /* -----------------------------------------------------
       ROUTING
       ----------------------------------------------------- */

    routing =
      chooseModel(profile);


    model =
      routing.model;


    /* -----------------------------------------------------
       SYSTEM INSTRUCTION
       ----------------------------------------------------- */

    const system = `
You are ACI, an enterprise AI assistant.

Return the user's requested result directly.

Do not mention:

- internal routing
- model selection
- token costs
- ACI economics

unless the user explicitly asks.

Be accurate, concise and professional.

Task type:
${profile.taskType}

Complexity:
${profile.complexity}/5

Sensitivity:
${profile.sensitivity}

Required quality target:
${profile.requiredQuality}%
`;


    /* -----------------------------------------------------
       EXECUTE
       ----------------------------------------------------- */

    started =
      Date.now();


    const result =
      await executeModel(
        model,
        system,
        prompt
      );


    /* -----------------------------------------------------
       ACTUAL MODEL
       ----------------------------------------------------- */

    const actualModel =
      result.selectedModel || model;


    /* -----------------------------------------------------
       LATENCY
       ----------------------------------------------------- */

    const latencyMs =
      Date.now() - started;


    /* -----------------------------------------------------
       RESPONSE
       ----------------------------------------------------- */

    const answer =
      result.answer || "";


    const usage =
      result.usage || {};


    /* -----------------------------------------------------
       COST
       ----------------------------------------------------- */

    const cost =
      calculateCost(
        actualModel,
        usage
      );


    /* -----------------------------------------------------
       OUTCOME
       ----------------------------------------------------- */

    const outcome =
      answer.trim()
        ? "PASS"
        : "FAIL";


    /* -----------------------------------------------------
       TRACE
       ----------------------------------------------------- */

    const trace = {

      requestId,

      taskType:
        profile.taskType,

      complexity:
        profile.complexity,

      sensitivity:
        profile.sensitivity,

      requiredQuality:
        profile.requiredQuality,

      routingTier:
        actualModel.tier,

      routingReason:
        routing.reason,

      latencyMs,

      inputTokens:
        usage.input_tokens ?? 0,

      outputTokens:
        usage.output_tokens ?? 0,

      totalTokens:
        usage.total_tokens ?? 0,

      outcome

    };


    /* -----------------------------------------------------
       DATABASE LOG
       ----------------------------------------------------- */

    await saveLog({

      request_id:
        requestId,

      created_at:
        new Date().toISOString(),

      provider:
        actualModel.provider,

      task_type:
        profile.taskType,

      complexity:
        profile.complexity,

      sensitivity:
        profile.sensitivity,

      required_quality:
        profile.requiredQuality,

      routing_tier:
        actualModel.tier,

      routing_reason:
        routing.reason,

      model:
        actualModel.id,

      latency_ms:
        latencyMs,

      input_tokens:
        usage.input_tokens ?? 0,

      output_tokens:
        usage.output_tokens ?? 0,

      total_tokens:
        usage.total_tokens ?? 0,

      estimated_cost_usd:
        cost,

      outcome,

      fallback_used:
        result.fallbackUsed || false,

      /*
       * Content storage remains controlled by
       * ACI_STORE_CONTENT.
       */

      prompt:
        process.env.ACI_STORE_CONTENT === "true"
          ? prompt
          : null,

      output:
        process.env.ACI_STORE_CONTENT === "true"
          ? answer
          : null
    });


    /* -----------------------------------------------------
       EMPLOYEE RESPONSE
       ----------------------------------------------------- */

    /*
     * IMPORTANT:
     *
     * Model, provider and cost are deliberately NOT
     * returned to the employee interface.
     *
     * They remain internal ACI economics data.
     */

    return res.status(200).json({

      answer,

      trace

    });


  } catch (error) {

    /* =====================================================
       FAILURE HANDLING
       ===================================================== */

    console.error(
      "ACI backend error:",
      error
    );


    /*
     * Record failed requests too.
     *
     * This is important for ACI because availability is
     * itself an economic/operational metric.
     */

    if (requestId) {

      const latencyMs =
        Date.now() - started;


      try {

        await saveLog({

          request_id:
            requestId,

          created_at:
            new Date().toISOString(),

          provider:
            model?.provider || null,

          task_type:
            profile?.taskType || null,

          complexity:
            profile?.complexity || null,

          sensitivity:
            profile?.sensitivity || null,

          required_quality:
            profile?.requiredQuality || null,

          routing_tier:
            model?.tier || null,

          routing_reason:
            routing?.reason ||
            null,

          model:
            model?.id || null,

          latency_ms:
            latencyMs,

          input_tokens:
            0,

          output_tokens:
            0,

          total_tokens:
            0,

          estimated_cost_usd:
            0,

          outcome:
            "FAIL",

          fallback_used:
            false,

          prompt:
            process.env.ACI_STORE_CONTENT === "true"
              ? req.body?.prompt || null
              : null,

          output:
            null
        });

      } catch (logError) {

        console.error(
          "Failed to record failed request:",
          logError
        );
      }
    }


    return res.status(500).json({

      error:
        error?.message ||
        "AI request failed."

    });
  }
}
