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

/** Consigne pour répondre À LA PLACE de l'utilisateur à un message reçu (SMS / WhatsApp). */
export function buildReplyPrompt({ garde_fous, souvenirs, contact }) {
  return [
    buildSystemPrompt({ garde_fous, souvenirs }),
    `Tu écris la réponse à un message reçu de « ${contact} ». Tu parles AU NOM de l'utilisateur, à la première personne, comme lui.`,
    "Réponds uniquement par le texte du message à envoyer : pas de guillemets, pas d'explication, pas de signature. 1 à 3 phrases courtes, même langue que le message reçu.",
    "Si le message demande quelque chose que tu ne peux pas décider à sa place (argent, rendez-vous, information personnelle), réponds poliment que tu reviens vers la personne bientôt.",
  ].join("\n");
}
