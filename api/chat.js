import OpenAI from "openai";

/* =========================================================
   ACI MODEL REGISTRY
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
   CLASSIFICATION
========================================================= */

function classify(text) {

  const t =
    text.toLowerCase();

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
   INTELLIGENCE
========================================================= */

function intelligence(
  text
) {

  const taskType =
    classify(text);

  let complexity =
    1;

  if (
    text.length > 500
  ) {
    complexity++;
  }

  if (
    text.length > 1500
  ) {
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

  complexity =
    Math.min(
      5,
      complexity
    );


  let sensitivity =
    "Low";


  if (
    /password|credential|secret|api key|token|salary|bank|credit card|medical|patient/i.test(
      text
    )
  ) {

    sensitivity =
      "High";

  } else if (
    /client|customer|employee|internal|company|business|contract|financial/i.test(
      text
    )
  ) {

    sensitivity =
      "Medium";

  }


  const requiredQuality =
    Math.min(
      96,
      76 +
        complexity * 3 +
        (
          sensitivity === "Medium"
            ? 2
            : 0
        ) +
        (
          sensitivity === "High"
            ? 5
            : 0
        )
    );


  return {

    taskType,

    complexity,

    sensitivity,

    requiredQuality

  };

}


/* =========================================================
   ROUTING
========================================================= */

function chooseModel(
  profile
) {

  /*
   * Important:
   *
   * We are not pretending the model has a guaranteed
   * quality percentage.
   *
   * This is a routing policy.
   */


  if (
    profile.complexity >= 4 ||
    profile.taskType ===
      "Production / Technical"
  ) {

    return {

      model:
        MODELS.gemini_flash,

      reason:
        "High-complexity task routed to advanced Gemini model"

    };

  }


  if (
    profile.complexity >= 3 ||
    profile.requiredQuality >= 88
  ) {

    return {

      model:
        MODELS.gemini_balanced,

      reason:
        "Medium-complexity task routed to balanced Gemini model"

    };

  }


  return {

    model:
      MODELS.gemini_efficient,

    reason:
      "Low-complexity task routed to efficient Gemini model"

  };

}


/* =========================================================
   GEMINI
========================================================= */

async function callGemini(
  model,
  system,
  prompt,
  file
) {

  if (
    !process.env.GEMINI_API_KEY
  ) {

    throw new Error(
      "GEMINI_API_KEY is not configured in Vercel."
    );

  }


  /*
   * Normal request
   */

  let input;


  if (
    file &&
    file.base64
  ) {

    /*
     * Native Gemini document/image input.
     *
     * PDF:
     *   type = document
     *
     * Images:
     *   type = image
     *
     * Everything else:
     *   text extraction is handled by frontend
     */

    if (
      file.mimeType ===
      "application/pdf"
    ) {

      input = [

        {
          type: "text",
          text: prompt
        },

        {
          type: "document",

          data:
            file.base64,

          mime_type:
            "application/pdf"

        }

      ];

    } else if (
      file.mimeType.startsWith(
        "image/"
      )
    ) {

      input = [

        {
          type: "text",
          text: prompt
        },

        {
          type: "image",

          data:
            file.base64,

          mime_type:
            file.mimeType

        }

      ];

    } else {

      /*
       * Non-PDF text files should already have been
       * extracted in the browser.
       */

      input = prompt;

    }

  } else {

    input =
      prompt;

  }


  const response =
    await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            process.env.GEMINI_API_KEY

        },

        body:
          JSON.stringify({

            model:
              model.id,

            system_instruction:
              system,

            input,

            store:
              false

          })

      }
    );


  const data =
    await response.json();


  if (
    !response.ok
  ) {

    throw new Error(
      data?.error?.message ||
      "Gemini API request failed."
    );

  }


  let answer =
    "";


  if (
    Array.isArray(
      data.steps
    )
  ) {

    for (
      const step of data.steps
    ) {

      if (
        step.type !==
          "model_output" ||
        !Array.isArray(
          step.content
        )
      ) {

        continue;

      }


      for (
        const content of
          step.content
      ) {

        if (
          content.type ===
            "text" &&
          typeof content.text ===
            "string"
        ) {

          answer +=
            content.text;

        }

      }

    }

  }


  if (
    !answer &&
    typeof data.output_text ===
      "string"
  ) {

    answer =
      data.output_text;

  }


  const usage =
    data.usage ||
    {};


  return {

    answer,

    usage: {

      input_tokens:
        usage.total_input_tokens ||
        0,

      output_tokens:
        usage.total_output_tokens ||
        0,

      total_tokens:
        usage.total_tokens ||
        0

    }

  };

}


/* =========================================================
   GEMINI FALLBACK
========================================================= */

async function callGeminiWithFallback(
  primaryModel,
  system,
  prompt,
  file
) {

  const candidates = [];


  /*
   * Keep complex requests on stronger models.
   * Do not blindly downgrade everything to Lite.
   */


  candidates.push(
    primaryModel
  );


  if (
    primaryModel.id !==
    MODELS.gemini_balanced.id
  ) {

    candidates.push(
      MODELS.gemini_balanced
    );

  }


  if (
    primaryModel.id !==
    MODELS.gemini_efficient.id
  ) {

    candidates.push(
      MODELS.gemini_efficient
    );

  }


  let lastError =
    null;


  for (
    const candidate of
      candidates
  ) {

    try {

      console.log(
        `ACI trying Gemini model: ${candidate.id}`
      );


      const result =
        await callGemini(
          candidate,
          system,
          prompt,
          file
        );


      return {

        ...result,

        selectedModel:
          candidate,

        fallbackUsed:
          candidate.id !==
          primaryModel.id

      };

    } catch (
      error
    ) {

      lastError =
        error;


      console.error(
        `ACI model ${candidate.id} failed:`,
        error?.message
      );

    }

  }


  throw new Error(
    lastError?.message ||
    "All Gemini models failed."
  );

}


/* =========================================================
   OPENAI
========================================================= */

async function callOpenAI(
  model,
  system,
  prompt
) {

  if (
    !process.env.OPENAI_API_KEY
  ) {

    throw new Error(
      "OPENAI_API_KEY is not configured."
    );

  }


  const client =
    new OpenAI({

      apiKey:
        process.env.OPENAI_API_KEY

    });


  const response =
    await client.responses.create({

      model:
        model.id,

      instructions:
        system,

      input:
        prompt

    });


  return {

    answer:
      response.output_text ||
      "",

    usage: {

      input_tokens:
        response.usage?.input_tokens ||
        0,

      output_tokens:
        response.usage?.output_tokens ||
        0,

      total_tokens:
        response.usage?.total_tokens ||
        0

    }

  };

}


/* =========================================================
   EXECUTE MODEL
========================================================= */

async function executeModel(
  model,
  system,
  prompt,
  file
) {

  if (
    model.provider ===
    "google"
  ) {

    return await callGeminiWithFallback(
      model,
      system,
      prompt,
      file
    );

  }


  if (
    model.provider ===
    "openai"
  ) {

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


/* =========================================================
   COST
========================================================= */

function calculateCost(
  model,
  usage
) {

  const inputTokens =
    usage?.input_tokens ||
    0;

  const outputTokens =
    usage?.output_tokens ||
    0;


  const inputCost =
    (
      inputTokens /
      1_000_000
    ) *
    model.inputPerMillion;


  const outputCost =
    (
      outputTokens /
      1_000_000
    ) *
    model.outputPerMillion;


  return Number(
    (
      inputCost +
      outputCost
    ).toFixed(8)
  );

}


/* =========================================================
   SUPABASE LOGGING
========================================================= */

async function saveLog(
  record
) {

  const url =
    process.env.SUPABASE_URL;


  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;


  if (
    !url ||
    !key
  ) {

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

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            apikey:
              key,

            Authorization:
              `Bearer ${key}`,

            Prefer:
              "return=minimal"

          },

          body:
            JSON.stringify(
              record
            )

        }
      );


    if (
      !response.ok
    ) {

      console.error(
        "Supabase logging failed:",
        await response.text()
      );

    }

  } catch (
    error
  ) {

    console.error(
      "Database logging failed:",
      error
    );

  }

}


/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {

  if (
    req.method !==
    "POST"
  ) {

    return res
      .status(405)
      .json({

        error:
          "POST only"

      });

  }


  const started =
    Date.now();


  try {

    const body =
      req.body ||
      {};


    const prompt =
      body.prompt;


    const file =
      body.file ||
      null;


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (
      !prompt ||
      typeof prompt !==
        "string"
    ) {

      return res
        .status(400)
        .json({

          error:
            "A prompt is required."

        });

    }


    if (
      file &&
      typeof file !==
        "object"
    ) {

      return res
        .status(400)
        .json({

          error:
            "Invalid file payload."

        });

    }


    /*
     * Protect the API from accidentally huge browser
     * payloads.
     *
     * Keep this conservative for Vercel.
     */

    if (
      file?.base64 &&
      file.base64.length >
        4_000_000
    ) {

      return res
        .status(413)
        .json({

          error:
            "File is too large for inline processing. Please use a smaller file."

        });

    }


    const profile =
      intelligence(
        prompt
      );


    const routing =
      chooseModel(
        profile
      );


    const requestedModel =
      routing.model;


    const requestId =
      `ACI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;


    const system = `

You are ACI, an enterprise AI assistant.

Return the user's requested result directly.

If a document or image is attached:

- actually inspect it
- base your answer on its contents
- do not claim you read something you cannot access
- mention relevant sections, tables or evidence when useful

Do not mention:

- internal routing
- model selection
- token costs
- ACI economics

unless the user explicitly asks.

Be accurate, useful, concise and professional.

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
     * If a text file was extracted by frontend,
     * append it to the prompt.
     */

    let finalPrompt =
      prompt;


    if (
      file &&
      file.extractedText
    ) {

      finalPrompt +=
        `\n\n[ATTACHED DOCUMENT: ${file.name}]\n\n${file.extractedText}\n\n[END ATTACHED DOCUMENT]`;

    }


    /*
     * Execute
     */

    const result =
      await executeModel(
        requestedModel,
        system,
        finalPrompt,
        file
      );


    const actualModel =
      result.selectedModel ||
      requestedModel;


    const latencyMs =
      Date.now() -
      started;


    const answer =
      result.answer ||
      "";


    const usage =
      result.usage ||
      {};


    const cost =
      calculateCost(
        actualModel,
        usage
      );


    const outcome =
      answer
        ? "PASS"
        : "FAIL";


    /*
     * Baseline model:
     *
     * For ACI economics, we need something against which
     * we compare the selected model.
     *
     * Current baseline = advanced Gemini.
     *
     * This is an estimated counterfactual, not a claim
     * that Gemini 3.8 was actually called.
     */

    const baselineCost =
      calculateCost(
        MODELS.gemini_flash,
        usage
      );


    const costAvoided =
      Math.max(
        0,
        baselineCost -
          cost
      );


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

      provider:
        actualModel.provider,

      model:
        actualModel.id,

      fallbackUsed:
        result.fallbackUsed ||
        false,

      latencyMs,

      inputTokens:
        usage.input_tokens ||
        0,

      outputTokens:
        usage.output_tokens ||
        0,

      totalTokens:
        usage.total_tokens ||
        0,

      estimatedCostUSD:
        cost,

      baselineCostUSD:
        baselineCost,

      costAvoidedUSD:
        costAvoided,

      outcome

    };


    /* -----------------------------------------------------
       SAVE
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
        usage.input_tokens ||
        0,

      output_tokens:
        usage.output_tokens ||
        0,

      total_tokens:
        usage.total_tokens ||
        0,

      estimated_cost_usd:
        cost,

      outcome,

      fallback_used:
        result.fallbackUsed ||
        false,

      /*
       * Store content only if explicitly enabled.
       */

      prompt:
        process.env.ACI_STORE_CONTENT ===
        "true"
          ? prompt
          : null,

      output:
        process.env.ACI_STORE_CONTENT ===
        "true"
          ? answer
          : null

    });


    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return res
      .status(200)
      .json({

        answer,

        trace

      });


  } catch (
    error
  ) {

    console.error(
      "ACI backend error:",
      error
    );


    return res
      .status(500)
      .json({

        error:
          error?.message ||
          "AI request failed."

      });

  }

}
