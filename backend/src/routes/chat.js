import express from "express";
import { AiError, generate } from "../ai/index.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { query } from "../db.js";
import { HttpError, wrap } from "../middleware.js";
import { rateLimit } from "../security.js";
import { getReglages } from "./reglages.js";

const router = express.Router();
// Les offres IA gratuites ont des quotas : on protège chaque compte contre les rafales.
const limiter = rateLimit({ windowMs: 60_000, max: 20, key: (req) => req.user.id });

router.post("/", limiter, wrap(async (req, res) => {
  const input = req.body?.messages;
  if (!Array.isArray(input) || input.length === 0) throw new HttpError(400, "Message vide.");
  const messages = input.slice(-20).map((m) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? "").slice(0, 4000),
  }));
  if (messages.at(-1).role !== "user" || !messages.at(-1).content.trim()) throw new HttpError(400, "Message vide.");

  const [reglages, souvenirs] = await Promise.all([
    getReglages(req.user.id),
    query("select contenu from kora.souvenirs where user_id = $1 order by created_at desc limit 50", [req.user.id]).then((r) => r.rows),
  ]);
  const system = buildSystemPrompt({ garde_fous: reglages.garde_fous, souvenirs });

  try {
    const { text, provider } = await generate({ system, messages, prefs: reglages.fournisseurs_ia });
    res.json({ reply: text, provider });
  } catch (e) {
    if (e instanceof AiError) {
      throw new HttpError(503, "Kora n'a pas pu joindre une IA pour l'instant. Vérifie les clés et l'ordre des fournisseurs dans les Réglages.");
    }
    throw e;
  }
}));

export default router;
