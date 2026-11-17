import { PROVIDERS, normalizeProviderPrefs, providerKey, providerModel } from "./providers.js";

export class AiError extends Error {
  constructor(message, attempts = []) {
    super(message);
    this.attempts = attempts;
  }
}

async function callProvider(id, { system, messages, fetchImpl, timeoutMs }) {
  const p = PROVIDERS[id];
  const res = await fetchImpl(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerKey(id)}`, ...(p.headers || {}) },
    body: JSON.stringify({
      model: providerModel(id),
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    const err = new Error(`HTTP ${res.status} ${detail}`.trim());
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : "";
  if (!text) throw new Error("Réponse vide");
  return text;
}

/**
 * Essaie les fournisseurs actifs (et dont la clé est configurée) dans l'ordre choisi par
 * l'utilisateur ; passe automatiquement au suivant en cas d'erreur, de quota ou de lenteur.
 */
export async function generate({ system, messages, prefs, fetchImpl = fetch, timeoutMs = 25_000 }) {
  const order = normalizeProviderPrefs(prefs).filter((p) => p.actif && p.configure);
  if (!order.length) throw new AiError("Aucun fournisseur IA actif avec une clé configurée.");
  const attempts = [];
  for (const p of order) {
    try {
      const text = await callProvider(p.id, { system, messages, fetchImpl, timeoutMs });
      return { text, provider: p.id, attempts };
    } catch (e) {
      attempts.push({ provider: p.id, error: e.message, status: e.status });
      console.warn(`IA « ${p.id} » en échec (${e.message}), essai du suivant…`);
    }
  }
  throw new AiError("Tous les fournisseurs IA ont échoué.", attempts);
}
