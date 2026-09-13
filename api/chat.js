import OpenAI from "openai";

const MODELS = {
  efficient: {
    id: "gpt-5.6-luna",
    inputPerMillion: 0.20,
    outputPerMillion: 1.20
  },

  balanced: {
    id: "gpt-5.6-terra",
    inputPerMillion: 2.00,
    outputPerMillion: 12.00
  },

  frontier: {
    id: "gpt-5.6-sol",
    inputPerMillion: 4.00,
    outputPerMillion: 20.00
  }
};


// -----------------------------
// TASK CLASSIFICATION
// -----------------------------

function classify(text) {
  const t = text.toLowerCase();

  if (/production|outage|incident|root cause|architecture|critical/.test(t))
    return "Production / Technical";

  if (/debug|bug|error|python|javascript|java|sql|code|api/.test(t))
    return "Coding / Technical";

  if (/contract|legal|clause|liability|indemnity|compliance/.test(t))
    return "Document / Legal";

  if (/email|mail|reply|response|client|manager|draft/.test(t))
    return "Email / Communication";

  if (/meeting|transcript|minutes|conversation|chat|action items/.test(t))
    return "Meeting / Conversation";

  if (/summarize|summarise|summary|extract/.test(t))
    return "Summarization / Extraction";

  if (/research|competitor|market|compare|investigate/.test(t))
    return "Research / Analysis";

  if (/revenue|profit|margin|financial|forecast|cash flow/.test(t))
    return "Business / Financial Analysis";

  return "General Assistance";
}


// -----------------------------
// ACI INTELLIGENCE
// -----------------------------

function intelligence(text) {

  const taskType = classify(text);

  let complexity = 1;

  if (text.length > 500) complexity++;
  if (text.length > 1500) complexity++;

  if (
    /analyze|analyse|investigate|compare|evaluate|reason|strategy|architecture|design/i
      .test(text)
  ) {
    complexity++;
  }

  if (
    /production|incident|contract|legal|financial|security|critical/i
      .test(text)
  ) {
    complexity++;
  }

  complexity = Math.min(5, complexity);


  let sensitivity = "Low";

  if (
    /password|credential|secret|api key|token|salary|bank|credit card|medical|patient/i
      .test(text)
  ) {
    sensitivity = "High";

  } else if (
    /client|customer|employee|internal|company|business|contract|financial/i
      .test(text)
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


// -----------------------------
// MODEL ROUTER
// -----------------------------

function chooseModel(profile) {

  // High-risk enterprise tasks
  if (
    profile.sensitivity === "High" &&
    profile.complexity >= 4
  ) {
    return {
      tier: "frontier",
      reason: "High sensitivity + high complexity"
    };
  }


  // Production / architecture / serious technical work
  if (
    profile.complexity >= 4 ||
    profile.taskType === "Production / Technical"
  ) {
    return {
      tier: "frontier",
      reason: "High-complexity or production-critical task"
    };
  }


  // Medium complexity
  if (
    profile.complexity >= 3 ||
    profile.requiredQuality >= 88
  ) {
    return {
      tier: "balanced",
      reason: "Medium complexity / quality requirement"
    };
  }


  // Normal everyday work
  return {
    tier: "efficient",
    reason: "Low-complexity task"
  };
}


// -----------------------------
// COST CALCULATION
// -----------------------------

function calculateCost(model, usage) {

  const inputTokens = usage?.input_tokens || 0;
  const outputTokens = usage?.output_tokens || 0;

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


// -----------------------------
// DATABASE LOGGING
// -----------------------------

async function saveLog(record) {

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("Supabase logging not configured.");
    return;
  }

  try {

    await fetch(
      `${url}/rest/v1/aci_requests`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`,
          "Prefer": "return=minimal"
        },

        body: JSON.stringify(record)
      }
    );

  } catch (error) {

    console.error(
      "Database logging failed:",
      error
    );
  }
}


// -----------------------------
// MAIN API
// -----------------------------

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "POST only" });
  }


  if (!process.env.OPENAI_API_KEY) {

    return res
      .status(500)
      .json({
        error:
          "OPENAI_API_KEY is not configured."
      });
  }


  try {

    const { prompt } = req.body || {};


    if (
      !prompt ||
      typeof prompt !== "string"
    ) {

      return res
        .status(400)
        .json({
          error:
            "A prompt is required."
        });
    }


    // -------------------------
    // ACI INTELLIGENCE
    // -------------------------

    const profile =
      intelligence(prompt);

    const routing =
      chooseModel(profile);

    const model =
      MODELS[routing.tier];


    const requestId =
      `ACI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;


    const started = Date.now();


    // -------------------------
    // OPENAI
    // -------------------------

    const client =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY
      });


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


    const response =
      await client.responses.create({

        model: model.id,

        instructions: system,

        input: prompt
      });


    const answer =
      response.output_text || "";


    const usage =
      response.usage || {};


    const latencyMs =
      Date.now() - started;


    const cost =
      calculateCost(
        model,
        usage
      );


    // -------------------------
    // TRACE
    // -------------------------

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
        routing.tier,

      routingReason:
        routing.reason,

      model:
        model.id,

      latencyMs,

      inputTokens:
        usage.input_tokens ?? null,

      outputTokens:
        usage.output_tokens ?? null,

      totalTokens:
        usage.total_tokens ?? null,

      estimatedCostUSD:
        cost,

      outcome:
        answer ? "PASS" : "FAIL"
    };


    // -------------------------
    // SAVE TO DATABASE
    // -------------------------

    await saveLog({

      request_id:
        requestId,

      created_at:
        new Date().toISOString(),

      task_type:
        profile.taskType,

      complexity:
        profile.complexity,

      sensitivity:
        profile.sensitivity,

      required_quality:
        profile.requiredQuality,

      routing_tier:
        routing.tier,

      routing_reason:
        routing.reason,

      model:
        model.id,

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

      outcome:
        answer ? "PASS" : "FAIL",

      prompt:
        process.env.ACI_STORE_CONTENT === "true"
          ? prompt
          : null,

      output:
        process.env.ACI_STORE_CONTENT === "true"
          ? answer
          : null
    });


    // -------------------------
    // EMPLOYEE RESPONSE
    // -------------------------

    return res
      .status(200)
      .json({

        answer,

        trace: {

          ...trace,

          // Employee does not need
          // to see the model.
          model: undefined,

          routingReason:
            undefined,

          estimatedCostUSD:
            undefined
        }
      });


  } catch (error) {

    console.error(error);

    return res
      .status(500)
      .json({

        error:
          error?.message ||
          "AI request failed."
      });
  }
}
