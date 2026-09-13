import OpenAI from "openai";

/*
===========================================================
ACI MODEL REGISTRY
===========================================================

ACI does not expose these models to employees.

The router chooses between approved models.
*/

const MODELS = {

  gemini_flash: {
    provider: "google",
    id: "gemini-3.8-flash",
    tier: "efficient",
    inputPerMillion: 0.75,
    outputPerMillion: 3.75
  },

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


/*
===========================================================
TASK CLASSIFICATION
===========================================================
*/

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


/*
===========================================================
ACI INTELLIGENCE
===========================================================
*/

function intelligence(text) {

  const taskType = classify(text);

  let complexity = 1;

  if (text.length > 500)
    complexity++;

  if (text.length > 1500)
    complexity++;

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


/*
===========================================================
ACI ROUTER
===========================================================

For now Gemini is the active fallback provider.

This allows us to test ACI even while the OpenAI account
has no remaining API credits.
*/

function chooseModel(profile) {

  /*
  High complexity / production work

  Use Gemini 3.8 Flash for now.
  */
  if (
    profile.complexity >= 4 ||
    profile.taskType === "Production / Technical"
  ) {

    return {
      model: MODELS.gemini_flash,
      reason: "High-complexity task routed to Gemini"
    };

  }


  /*
  Medium complexity
  */

  if (
    profile.complexity >= 3 ||
    profile.requiredQuality >= 88
  ) {

    return {
      model: MODELS.gemini_flash,
      reason: "Medium-complexity task routed to Gemini"
    };

  }


  /*
  Simple tasks
  */

  return {
    model: MODELS.gemini_flash,
    reason: "Low-complexity task routed to Gemini"
  };

}


/*
===========================================================
GEMINI
===========================================================
*/

async function callGemini(
  model,
  system,
  prompt
) {

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

        input: prompt

      })

    }
  );


  const data = await response.json();


  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      "Gemini API request failed."
    );

  }


  /*
  Gemini Interactions API returns output items.
  Extract textual output.
  */

  let answer = "";


  if (Array.isArray(data.output)) {

    answer = data.output
      .filter(item =>
        item.type === "text" ||
        item.type === "message"
      )
      .map(item => {

        if (typeof item.text === "string")
          return item.text;

        if (Array.isArray(item.content)) {

          return item.content
            .map(part => part.text || "")
            .join("");

        }

        return "";

      })
      .join("");

  }


  /*
  Fallback for response shapes containing output_text.
  */

  if (!answer && data.output_text) {

    answer = data.output_text;

  }


  const usage = data.usage || {};


  return {

    answer,

    usage: {

      input_tokens:
        usage.input_tokens ||
        usage.prompt_tokens ||
        0,

      output_tokens:
        usage.output_tokens ||
        usage.candidates_tokens ||
        0,

      total_tokens:
        usage.total_tokens ||
        0

    }

  };

}


/*
===========================================================
OPENAI
===========================================================
*/

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


/*
===========================================================
PROVIDER EXECUTION
===========================================================
*/

async function executeModel(
  model,
  system,
  prompt
) {

  if (model.provider === "google") {

    return await callGemini(
      model,
      system,
      prompt
    );

  }


  if (model.provider === "openai") {

    return await callOpenAI(
      model,
      system,
      prompt
    );

  }


  throw new Error(
    `Unsupported provider: ${model.provider}`
  );

}


/*
===========================================================
COST CALCULATION
===========================================================
*/

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


/*
===========================================================
SUPABASE LOGGING
===========================================================
*/

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


/*
===========================================================
MAIN API
===========================================================
*/

export default async function handler(
  req,
  res
) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "POST only"
    });

  }


  try {

    const {
      prompt
    } = req.body || {};


    if (
      !prompt ||
      typeof prompt !== "string"
    ) {

      return res.status(400).json({
        error: "A prompt is required."
      });

    }


    /*
    -----------------------------------------
    Analyze request
    -----------------------------------------
    */

    const profile =
      intelligence(prompt);


    /*
    -----------------------------------------
    Choose model
    -----------------------------------------
    */

    const routing =
      chooseModel(profile);


    const model =
      routing.model;


    /*
    -----------------------------------------
    Request ID
    -----------------------------------------
    */

    const requestId =
      `ACI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;


    const started =
      Date.now();


    /*
    -----------------------------------------
    System instruction
    -----------------------------------------
    */

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


    /*
    -----------------------------------------
    Execute provider
    -----------------------------------------
    */

    const result =
      await executeModel(
        model,
        system,
        prompt
      );


    const latencyMs =
      Date.now() - started;


    const answer =
      result.answer || "";


    const usage =
      result.usage || {};


    const cost =
      calculateCost(
        model,
        usage
      );


    /*
    -----------------------------------------
    Trace
    -----------------------------------------
    */

    const trace = {

      requestId,

      provider:
        model.provider,

      taskType:
        profile.taskType,

      complexity:
        profile.complexity,

      sensitivity:
        profile.sensitivity,

      requiredQuality:
        profile.requiredQuality,

      routingTier:
        model.tier,

      routingReason:
        routing.reason,

      model:
        model.id,

      latencyMs,

      inputTokens:
        usage.input_tokens ?? 0,

      outputTokens:
        usage.output_tokens ?? 0,

      totalTokens:
        usage.total_tokens ?? 0,

      estimatedCostUSD:
        cost,

      outcome:
        answer
          ? "PASS"
          : "FAIL"

    };


    /*
    -----------------------------------------
    Save to Supabase
    -----------------------------------------
    */

    await saveLog({

      request_id:
        requestId,

      created_at:
        new Date().toISOString(),

      provider:
        model.provider,

      task_type:
        profile.taskType,

      complexity:
        profile.complexity,

      sensitivity:
        profile.sensitivity,

      required_quality:
        profile.requiredQuality,

      routing_tier:
        model.tier,

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
        answer
          ? "PASS"
          : "FAIL",

      prompt:
        process.env.ACI_STORE_CONTENT === "true"
          ? prompt
          : null,

      output:
        process.env.ACI_STORE_CONTENT === "true"
          ? answer
          : null

    });


    /*
    -----------------------------------------
    Employee response
    -----------------------------------------

    IMPORTANT:
    Model/provider/cost remain hidden.
    */

    return res.status(200).json({

      answer,

      trace: {

        requestId,

        taskType:
          profile.taskType,

        complexity:
          profile.complexity,

        sensitivity:
          profile.sensitivity,

        requiredQuality:
          profile.requiredQuality,

        latencyMs,

        inputTokens:
          usage.input_tokens ?? 0,

        outputTokens:
          usage.output_tokens ?? 0,

        totalTokens:
          usage.total_tokens ?? 0,

        outcome:
          answer
            ? "PASS"
            : "FAIL"

      }

    });


  } catch (error) {

    console.error(
      "ACI backend error:",
      error
    );


    return res.status(500).json({

      error:
        error?.message ||
        "AI request failed."

    });

  }

}
