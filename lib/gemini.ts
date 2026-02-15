import { GoogleGenAI } from "@google/genai";

const metaEnv = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>;

const GEMINI_API_KEY =
  process.env.API_KEY ||
  process.env.GEMINI_API_KEY ||
  metaEnv.VITE_GEMINI_API_KEY ||
  "";

const LOCAL_AI_BASE_URL = metaEnv.VITE_LOCAL_AI_BASE_URL || "";
const LOCAL_AI_MODEL = metaEnv.VITE_LOCAL_AI_MODEL || "llama3.1";
const LOCAL_IMAGE_API_URL = metaEnv.VITE_LOCAL_IMAGE_API_URL || "";

function hasRealGeminiKey(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== "PLACEHOLDER_API_KEY";
}

function getAI(): GoogleGenAI | null {
  if (!hasRealGeminiKey()) return null;
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

async function runGeminiText(prompt: string): Promise<string | null> {
  const ai = getAI();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text || null;
}

async function runLocalText(prompt: string): Promise<string | null> {
  if (!LOCAL_AI_BASE_URL) return null;
  const base = LOCAL_AI_BASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LOCAL_AI_MODEL,
      prompt,
      stream: false,
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  if (typeof payload?.response === "string" && payload.response.trim()) {
    return payload.response.trim();
  }
  return null;
}

async function runTextWithFallback(prompt: string, fallback: string): Promise<string> {
  try {
    const geminiText = await runGeminiText(prompt);
    if (geminiText) return geminiText;
  } catch {
    // Continue to local fallback.
  }

  try {
    const localText = await runLocalText(prompt);
    if (localText) return localText;
  } catch {
    // Continue to static fallback.
  }

  return fallback;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function makeLocalAvatar(description: string): string {
  const hash = hashString(description || "avatar");
  const hueA = hash % 360;
  const hueB = (hash * 7) % 360;
  const colorA = `hsl(${hueA}, 85%, 58%)`;
  const colorB = `hsl(${hueB}, 85%, 52%)`;
  const eyeShift = hash % 18;
  const mouthWidth = 44 + (hash % 28);
  const bodyPattern = Array.from({ length: 8 })
    .map((_, row) =>
      Array.from({ length: 8 })
        .map((__, col) => ((hash >> ((row + col) % 16)) & 1 ? 1 : 0))
        .map((cell, col) =>
          cell
            ? `<rect x="${col * 12}" y="${row * 12}" width="12" height="12" fill="rgba(255,255,255,0.16)" />`
            : ""
        )
        .join("")
    )
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorA}" />
      <stop offset="100%" stop-color="${colorB}" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="18" fill="#070b10"/>
  <rect x="16" y="16" width="224" height="224" rx="14" fill="url(#g)" opacity="0.24"/>
  <g transform="translate(80 92)">
    <rect x="0" y="0" width="96" height="96" rx="8" fill="url(#g)" />
    ${bodyPattern}
  </g>
  <rect x="${72 + eyeShift}" y="88" width="24" height="12" fill="#0b0f12"/>
  <rect x="${160 - eyeShift}" y="88" width="24" height="12" fill="#0b0f12"/>
  <rect x="${128 - Math.floor(mouthWidth / 2)}" y="154" width="${mouthWidth}" height="10" rx="4" fill="#0b0f12"/>
  <text x="128" y="222" text-anchor="middle" fill="#d6f4ff" font-size="16" font-family="monospace">LOCAL_AVATAR</text>
</svg>`.trim();

  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export async function getArenaStrategy(gameName: string) {
  return runTextWithFallback(
    `As an elite tactical AI for the Cyber Arena, provide a brief, 3-sentence high-level strategy briefing for the game "${gameName}". Use technical, cyberpunk jargon.`,
    "TACTICAL BRIEFING: Prioritize signal consistency, avoid noisy votes, and hedge against sudden phase swings."
  );
}

export async function getArenaOdds() {
  return runTextWithFallback(
    'Generate a short, cryptic tactical advice for betting in a cyberpunk arena. Mention "infiltration", "high-yield", and "probability". Max 15 words.',
    "Infiltration detected. High-yield windows emerge when probability drift outruns crowd confidence."
  );
}

export async function getNetworkStatus() {
  return runTextWithFallback(
    'Generate a short, cryptic network status update for a cyberpunk game dashboard. Mention "latency", "sub-node", and "encryption". Max 20 words.',
    "Latency stable. Sub-node consensus restored. Encryption tunnel healthy."
  );
}

export async function getInferenceLogs() {
  return runTextWithFallback(
    'Generate 5 short lines of "Inference Logs" for a high-stakes cyberpunk arena. Format: [TIME] [ACTION] [STATUS]. Use jargon like "Neural Hash", "Ghost Packet", "Node Breach".',
    "[07:31] [Neural Hash Sync] [LOCKED]\n[07:32] [Ghost Packet Sweep] [CLEAN]\n[07:33] [Node Breach Probe] [BLOCKED]\n[07:34] [Vote Drift Scan] [ELEVATED]\n[07:35] [Consensus Pulse] [STABLE]"
  );
}

async function runLocalImage(prompt: string): Promise<string | null> {
  if (!LOCAL_IMAGE_API_URL) return null;
  const base = LOCAL_IMAGE_API_URL.replace(/\/+$/, "");
  const response = await fetch(`${base}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `Cyberpunk portrait, neon lighting, robotic enhancements: ${prompt}`,
      width: 512,
      height: 512,
      steps: 20,
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const image = payload?.images?.[0];
  if (typeof image === "string" && image.length > 0) {
    return `data:image/png;base64,${image}`;
  }
  return null;
}

export async function generateCyberAvatar(description: string) {
  const ai = getAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              text: `A high-quality cyberpunk digital avatar portrait, neon lighting, robotic enhancements, glitch aesthetic, portrait centered: ${description}`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch {
      // Continue to local fallbacks.
    }
  }

  try {
    const localImage = await runLocalImage(description);
    if (localImage) return localImage;
  } catch {
    // Continue to deterministic local avatar.
  }

  return makeLocalAvatar(description);
}
