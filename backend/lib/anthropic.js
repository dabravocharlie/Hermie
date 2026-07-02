// Server-side Anthropic caller. The API key never reaches the browser.
const KEY = process.env.ANTHROPIC_API_KEY;
// Defaults to the model already proven in the user's account; override with
// HERMIE_MODEL if desired.
const MODEL = process.env.HERMIE_MODEL || "claude-sonnet-4-6";

export function hasKey() {
  return Boolean(KEY);
}

export async function callAnthropic({ system, messages, tools, maxTokens = 2000 }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools && tools.length ? { tools } : {}),
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Anthropic ${r.status}: ${t}`);
  }
  return r.json();
}
