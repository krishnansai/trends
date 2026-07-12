import {
  createVisionProfile,
  parseVisionProfile,
  VISION_IMAGE_ANALYZER_SYSTEM_PROMPT,
  type VisionProfile
} from "@/lib/vision";

type OllamaVisionResult = {
  error?: string;
  model: string | null;
  profile: VisionProfile;
  source: "browser-fallback" | "ollama";
};

type OllamaGenerateResponse = {
  error?: string;
  response?: string;
};

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_VISION_MODEL = "llava:latest";
const DEFAULT_OLLAMA_TIMEOUT_MS = 30000;

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
}

function getOllamaTimeoutMs() {
  const value = Number(process.env.OLLAMA_VISION_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_OLLAMA_TIMEOUT_MS;
}

function getOllamaVisionModel() {
  return process.env.OLLAMA_VISION_MODEL || DEFAULT_OLLAMA_VISION_MODEL;
}

export function isOllamaVisionEnabled() {
  return process.env.OLLAMA_VISION_ENABLED === "true";
}

function extractJsonPayload(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Ollama response did not contain a JSON object.");
    }

    return JSON.parse(value.slice(start, end + 1)) as unknown;
  }
}

function buildPrompt(fallback: VisionProfile) {
  return `${VISION_IMAGE_ANALYZER_SYSTEM_PROMPT}

If the image is unclear, use this fallback profile only for uncertain fields:
${JSON.stringify(fallback)}

Return only strict minified JSON.`;
}

export async function analyzeImageWithOllama(
  file: File,
  fallback: VisionProfile
): Promise<OllamaVisionResult> {
  const model = getOllamaVisionModel();

  if (!isOllamaVisionEnabled()) {
    return {
      model,
      profile: fallback,
      source: "browser-fallback"
    };
  }

  const timeoutMs = getOllamaTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
      body: JSON.stringify({
        format: "json",
        images: [imageBase64],
        model,
        options: {
          temperature: 0
        },
        prompt: buildPrompt(fallback),
        stream: false
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const payload = (await response.json()) as OllamaGenerateResponse;

    if (payload.error) {
      throw new Error(payload.error);
    }

    if (!payload.response) {
      throw new Error("Ollama response was empty.");
    }

    return {
      model,
      profile: parseVisionProfile(extractJsonPayload(payload.response), fallback),
      source: "ollama"
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ollama analysis failed.",
      model,
      profile: createVisionProfile(fallback),
      source: "browser-fallback"
    };
  } finally {
    clearTimeout(timeout);
  }
}
