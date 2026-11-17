import express from "express";
import { AiError, generate } from "../ai/index.js";
import { buildReplyPrompt } from "../ai/prompt.js";
import { query } from "../db.js";
import { HttpError, wrap } from "../middleware.js";
import { rateLimit } from "../security.js";
import { aiErrorMessage } from "./chat.js";
import { getReglages } from "./reglages.js";

const router = express.Router();
const limiter = rateLimit({ windowMs: 60_000, max: 30, key: (req) => req.user.id });

/**
 * Appelé par l'app Android quand un SMS / message WhatsApp arrive.
 * Répond { action: "send" | "draft" | "ignore", reponse?, id? } :
 *  - send  : l'app envoie la réponse tout de suite (contact en mode « Auto »)
 *  - draft : l'app propose la réponse à valider (contact en mode « Brouillon », le mode par défaut)
 *  - ignore: réponses coupées, en pause, ou contact en mode « Jamais »
 */
router.post("/", limiter, wrap(async (req, res) => {
  const contactNom = String(req.body?.contact ?? "").trim().slice(0, 100);
  const appli = req.body?.appli;
  const recu = String(req.body?.recu ?? "").trim().slice(0, 2000);
  if (!contactNom || !recu) throw new HttpError(400, "Message vide.");
  if (!["sms", "whatsapp"].includes(appli)) throw new HttpError(400, "Application invalide.");

  const reglages = await getReglages(req.user.id);
  const paused = reglages.pause_jusqua && new Date(reglages.pause_jusqua) > new Date();
  if (!reglages.reponses_auto || paused) return res.json({ action: "ignore", reason: "off" });

  // Contact inconnu : on le crée en mode « Brouillon » (jamais d'envoi automatique sans accord).
  let contact = (await query("select * from kora.contacts where user_id = $1 and lower(nom) = lower($2) and appli = $3", [req.user.id, contactNom, appli])).rows[0];
  if (!contact) {
    contact = (await query("insert into kora.contacts (user_id, nom, appli) values ($1,$2,$3) returning *", [req.user.id, contactNom, appli])).rows[0];
  }
  if (contact.mode === "jamais") return res.json({ action: "ignore", reason: "contact" });

  const souvenirs = (await query("select contenu from kora.souvenirs where user_id = $1 order by created_at desc limit 50", [req.user.id])).rows;
  const system = buildReplyPrompt({ garde_fous: reglages.garde_fous, souvenirs, contact: contactNom });

  let text;
  try {
    ({ text } = await generate({ system, messages: [{ role: "user", content: recu }], prefs: reglages.fournisseurs_ia }));
  } catch (e) {
    if (e instanceof AiError) throw new HttpError(503, aiErrorMessage(e));
    throw e;
  }
  const reponse = text.slice(0, 1500);
  const statut = contact.mode === "auto" ? "envoye" : "brouillon";
  const { rows } = await query(
    "insert into kora.messages_traites (user_id, contact_id, contact_nom, appli, recu, reponse, statut) values ($1,$2,$3,$4,$5,$6,$7) returning id",
    [req.user.id, contact.id, contactNom, appli, recu, reponse, statut],
  );
  res.json({ action: statut === "envoye" ? "send" : "draft", reponse, id: rows[0].id });
}));

export default router;
