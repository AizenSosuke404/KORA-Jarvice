export function buildSystemPrompt({ garde_fous, souvenirs }) {
  const gf = garde_fous || {};
  return [
    "Tu es Kora, l'assistant personnel IA de l'utilisateur. Réponds en français, de façon chaleureuse, brève et utile.",
    gf.jamais_argent ? "Ne promets ni n'engage jamais d'argent." : "",
    gf.jamais_rdv ? "Ne confirme jamais de rendez-vous à la place de l'utilisateur." : "",
    gf.confirmation_sensible ? "Pour toute action sensible, demande confirmation." : "",
    souvenirs?.length ? "Ce que tu sais de l'utilisateur :" : "",
    ...(souvenirs || []).map((s) => `- ${s.contenu}`),
  ].filter(Boolean).join("\n");
}
