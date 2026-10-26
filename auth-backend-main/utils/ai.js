// Provider-agnostic AI client. Switch providers with environment variables only — no code changes.
//
//   AI_PROVIDER=gemini   (default)  Google Gemini  — free key at https://aistudio.google.com/apikey
//   AI_PROVIDER=openai              Any OpenAI-compatible API: OpenAI, Groq (free tier), OpenRouter, Together...
//                                   (set AI_BASE_URL to the provider's /v1 URL)
//
//   AI_API_KEY        the provider's key
//   AI_MODEL          text model name (provider default is used if empty)
//   AI_VISION_MODEL   optional: model used when a photo is attached (falls back to AI_MODEL)
//   AI_BASE_URL       only for AI_PROVIDER=openai
//
// Uses the global fetch built into Node 18+.

class AIError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

const GEMINI_DEFAULT_MODEL = "gemini-flash-lite-latest"; // alias that always points at the current Flash-Lite
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_DEFAULT_URL = "https://api.openai.com/v1";

function getConfig() {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new AIError("The AI assistant isn't set up on this server yet.", 503);
  if (!["gemini", "openai"].includes(provider)) {
    throw new AIError(`Unknown AI_PROVIDER "${provider}" (use "gemini" or "openai").`, 503);
  }
  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL || (provider === "gemini" ? GEMINI_DEFAULT_MODEL : OPENAI_DEFAULT_MODEL),
    visionModel: process.env.AI_VISION_MODEL || null,
    baseUrl: (process.env.AI_BASE_URL || OPENAI_DEFAULT_URL).replace(/\/+$/, ""),
  };
}

async function postJSON(url, headers, body, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON error body */
    }
    return { ok: res.ok, status: res.status, data, text };
  } catch (err) {
    if (err.name === "AbortError") throw new AIError("The AI service took too long to respond. Please try again.", 504);
    throw new AIError("Could not reach the AI service.", 502);
  } finally {
    clearTimeout(timer);
  }
}

// Translates provider HTTP failures into friendly errors. Raw provider messages stay in the server log.
function failFrom(result, provider) {
  console.error(`AI ${provider} error ${result.status}:`, (result.text || "").slice(0, 500));
  if (result.status === 429) throw new AIError("The AI assistant is busy right now. Please try again in a minute.", 429);
  if (result.status === 401 || result.status === 403) {
    throw new AIError("The AI assistant is misconfigured on the server (the API key was rejected).", 503);
  }
  throw new AIError("The AI assistant couldn't answer right now. Please try again.", 502);
}

function parseDataUri(uri) {
  const m = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(uri || "");
  return m ? { mimeType: m[1], data: m[2] } : null;
}

// ---- Gemini ----
async function callGemini({ apiKey, model }, { system, messages, json, maxTokens }) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      { text: m.text },
      ...(m.image ? [{ inlineData: { mimeType: m.image.mimeType, data: m.image.data } }] : []),
    ],
  }));

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const result = await postJSON(url, { "x-goog-api-key": apiKey }, body);
  if (!result.ok) failFrom(result, "gemini");

  const text = (result.data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new AIError("The AI returned an empty answer. Please rephrase and try again.", 502);
  return text;
}

// ---- OpenAI-compatible (OpenAI, Groq, OpenRouter, ...) ----
async function callOpenAICompatible({ apiKey, model, baseUrl }, { system, messages, json, maxTokens }) {
  const chat = [
    { role: "system", content: system },
    ...messages.map((m) => ({
      role: m.role,
      content: m.image
        ? [
            { type: "text", text: m.text },
            { type: "image_url", image_url: { url: `data:${m.image.mimeType};base64,${m.image.data}` } },
          ]
        : m.text,
    })),
  ];

  const isOpenAI = baseUrl.includes("api.openai.com");
  const base = {
    model,
    messages: chat,
    // Newer OpenAI models require max_completion_tokens; most other providers still expect max_tokens.
    [isOpenAI ? "max_completion_tokens" : "max_tokens"]: maxTokens,
  };
  const headers = { Authorization: `Bearer ${apiKey}` };
  const url = `${baseUrl}/chat/completions`;

  let result = await postJSON(url, headers, json ? { ...base, response_format: { type: "json_object" } } : base);
  // Some providers/models don't support JSON mode — retry once without it (the prompt already demands JSON).
  if (!result.ok && result.status === 400 && json) result = await postJSON(url, headers, base);
  if (!result.ok) failFrom(result, "openai-compatible");

  const text = (result.data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new AIError("The AI returned an empty answer. Please rephrase and try again.", 502);
  return text;
}

/**
 * @param {string} system
 * @param {{role:'user'|'assistant', text:string, imageDataUri?:string}[]} messages
 * @param {boolean} json  ask for a JSON object reply
 */
async function generate({ system, messages, json = false, maxTokens = 2048 }) {
  const cfg = getConfig();
  const prepared = messages.map((m) => {
    if (!m.imageDataUri) return { role: m.role, text: m.text };
    const image = parseDataUri(m.imageDataUri);
    if (!image) throw new AIError("That image format isn't supported.", 400);
    return { role: m.role, text: m.text, image };
  });

  const hasImage = prepared.some((m) => m.image);
  const model = hasImage && cfg.visionModel ? cfg.visionModel : cfg.model;
  const args = { system, messages: prepared, json, maxTokens };

  return cfg.provider === "gemini"
    ? callGemini({ ...cfg, model }, args)
    : callOpenAICompatible({ ...cfg, model }, args);
}

// Tolerant JSON parsing: strips ``` fences and extracts the first {...} block if the model added chatter.
function parseJSONLoose(text) {
  const cleaned = String(text).replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AIError("The AI gave an unreadable answer. Please try again.", 502);
  }
}

async function generateJSON(args) {
  return parseJSONLoose(await generate({ ...args, json: true }));
}

module.exports = { generate, generateJSON, parseJSONLoose, parseDataUri, AIError };
