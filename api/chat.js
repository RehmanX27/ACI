import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

function classify(text) {
  const t = text.toLowerCase();
  if (/production|outage|incident|root cause|architecture|critical/.test(t)) return "Production / Technical";
  if (/debug|bug|error|python|javascript|java|sql|code|api/.test(t)) return "Coding / Technical";
  if (/contract|legal|clause|liability|indemnity|compliance/.test(t)) return "Document / Legal";
  if (/email|mail|reply|response|client|manager|draft/.test(t)) return "Email / Communication";
  if (/meeting|transcript|minutes|conversation|chat|action items/.test(t)) return "Meeting / Conversation";
  if (/summarize|summarise|summary|extract/.test(t)) return "Summarization / Extraction";
  if (/research|competitor|market|compare|investigate/.test(t)) return "Research / Analysis";
  if (/revenue|profit|margin|financial|forecast|cash flow/.test(t)) return "Business / Financial Analysis";
  return "General Assistance";
}

function intelligence(text) {
  const taskType = classify(text);
  let complexity = 1;
  if (text.length > 500) complexity++;
  if (text.length > 1500) complexity++;
  if (/analyze|analyse|investigate|compare|evaluate|reason|strategy|architecture|design/.test(text.toLowerCase())) complexity++;
  if (/production|incident|contract|legal|financial|security|critical/.test(text.toLowerCase())) complexity++;
  complexity = Math.min(5, complexity);

  let sensitivity = "Low";
  if (/password|credential|secret|api key|token|salary|bank|credit card|medical|patient/.test(text.toLowerCase())) sensitivity = "High";
  else if (/client|customer|employee|internal|company|business|contract|financial/.test(text.toLowerCase())) sensitivity = "Medium";

  const requiredQuality = Math.min(
    96,
    76 + complexity * 3 + (sensitivity === "Medium" ? 2 : 0) + (sensitivity === "High" ? 5 : 0)
  );

  return { taskType, complexity, sensitivity, requiredQuality };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured in Vercel environment variables."
    });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "A prompt is required." });
    }

    const profile = intelligence(prompt);
    const started = Date.now();

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `You are ACI, an enterprise AI assistant.
Return the user's requested result directly.
Do not mention internal routing, model selection, token costs, or ACI economics unless the user explicitly asks.
Be accurate, concise and professional.
Task type: ${profile.taskType}
Complexity estimate: ${profile.complexity}/5
Sensitivity: ${profile.sensitivity}
Required quality threshold: ${profile.requiredQuality}%`;

    const response = await client.responses.create({
      model: MODEL,
      instructions: system,
      input: prompt
    });

    const text = response.output_text || "";
    const usage = response.usage || {};

    // Prototype economics only. Replace with official/current pricing
    // for the exact model and your account before commercial use.
    const trace = {
      requestId: `ACI-${Date.now()}`,
      taskType: profile.taskType,
      complexity: profile.complexity,
      sensitivity: profile.sensitivity,
      requiredQuality: profile.requiredQuality,
      model: MODEL,
      latencyMs: Date.now() - started,
      inputTokens: usage.input_tokens ?? null,
      outputTokens: usage.output_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      outcome: text ? "PASS" : "FAIL"
    };

    return res.status(200).json({ answer: text, trace });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "AI request failed."
    });
  }
}