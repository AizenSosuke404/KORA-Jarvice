import express from "express";
import { query } from "../db.js";
import { HttpError, uuid, wrap } from "../middleware.js";

const router = express.Router();
const STATUTS = ["envoye", "brouillon", "annule", "corrige"];

router.get("/", wrap(async (req, res) => {
  const { rows } = await query("select * from kora.messages_traites where user_id = $1 order by created_at desc limit 50", [req.user.id]);
  res.json(rows);
}));

// Appelé par l'app Android quand un brouillon est envoyé depuis la notification.
router.post("/:id/envoye", wrap(async (req, res) => {
  const { rows } = await query("update kora.messages_traites set statut = 'envoye' where id = $1 and user_id = $2 returning *", [uuid(req.params.id), req.user.id]);
  if (!rows[0]) throw new HttpError(404, "Message introuvable.");
  res.json(rows[0]);
}));

router.patch("/:id", wrap(async (req, res) => {
  const b = req.body ?? {};
  const sets = [];
  const vals = [uuid(req.params.id), req.user.id];
  if ("statut" in b) {
    if (!STATUTS.includes(b.statut)) throw new HttpError(400, "Statut invalide.");
    vals.push(b.statut); sets.push(`statut = $${vals.length}`);
  }
  if ("reponse" in b) {
    const r = String(b.reponse ?? "").trim();
    if (!r || r.length > 2000) throw new HttpError(400, "Réponse invalide.");
    vals.push(r); sets.push(`reponse = $${vals.length}`);
  }
  if (!sets.length) throw new HttpError(400, "Rien à modifier.");
  const { rows } = await query(`update kora.messages_traites set ${sets.join(", ")} where id = $1 and user_id = $2 returning *`, vals);
  if (!rows[0]) throw new HttpError(404, "Message introuvable.");
  res.json(rows[0]);
}));

export default router;
