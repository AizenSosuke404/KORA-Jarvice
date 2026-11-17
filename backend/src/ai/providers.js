/**
 * Registre des fournisseurs d'IA.
 * Tous parlent le format « OpenAI chat/completions » : pour en ajouter un nouveau,
 * il suffit d'ajouter une entrée ici + sa clé API dans les variables d'environnement.
 * Les modèles par défaut sont modifiables sans toucher au code (variables *_MODEL).
 */
export const PROVIDERS = {
  groq: {
    nom: "Groq (offre gratuite)",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    defaultActif: true,
  },
  gemini: {
    nom: "Google Gemini (offre gratuite)",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
    defaultActif: true,
  },
  mistral: {
    nom: "Mistral (offre gratuite)",
    url: "https://api.mistral.ai/v1/chat/completions",
    keyEnv: "MISTRAL_API_KEY",
    modelEnv: "MISTRAL_MODEL",
    defaultModel: "mistral-small-latest",
    defaultActif: false,
  },
  openrouter: {
    nom: "OpenRouter (modèles gratuits)",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    defaultActif: false,
    headers: { "X-Title": "Kora" },
  },
};

export const providerKey = (id) => process.env[PROVIDERS[id].keyEnv] || "";
export const providerModel = (id) => process.env[PROVIDERS[id].modelEnv] || PROVIDERS[id].defaultModel;

/**
 * Nettoie la liste enregistrée par l'utilisateur : garde l'ordre choisi, retire les
 * fournisseurs inconnus, ajoute les nouveaux à la fin, et indique si la clé API est configurée.
 */
export function normalizeProviderPrefs(stored) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(stored) ? stored : []) {
    const id = item?.id;
    if (!PROVIDERS[id] || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, actif: typeof item.actif === "boolean" ? item.actif : PROVIDERS[id].defaultActif });
  }
  for (const id of Object.keys(PROVIDERS)) {
    if (!seen.has(id)) out.push({ id, actif: PROVIDERS[id].defaultActif });
  }
  return out.map((p) => ({ ...p, nom: PROVIDERS[p.id].nom, configure: !!providerKey(p.id) }));
}
