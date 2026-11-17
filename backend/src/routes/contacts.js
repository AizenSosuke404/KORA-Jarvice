import express from "express";
import { query } from "../db.js";
import { HttpError, uuid, wrap } from "../middleware.js";

const router = express.Router();

router.get("/", wrap(async (req, res) => {
  const { rows } = await query("select * from kora.contacts where user_id = $1 order by nom", [req.user.id]);
  res.json(rows);
}));

router.post("/", wrap(async (req, res) => {
  const nom = String(req.body?.nom ?? "").trim();
  if (!nom || nom.length > 100) throw new HttpError(400, "Nom invalide.");
  const appli = req.body?.appli ?? "whatsapp";
  if (!["sms", "whatsapp"].includes(appli)) throw new HttpError(400, "Application invalide.");
  const exists = await query("select 1 from kora.contacts where user_id = $1 and lower(nom) = lower($2) and appli = $3", [req.user.id, nom, appli]);
  if (exists.rows[0]) throw new HttpError(409, "Ce contact existe déjà.");
  const { rows } = await query("insert into kora.contacts (user_id, nom, appli) values ($1,$2,$3) returning *", [req.user.id, nom, appli]);
  res.status(201).json(rows[0]);
}));

router.delete("/:id", wrap(async (req, res) => {
  await query("delete from kora.contacts where id = $1 and user_id = $2", [uuid(req.params.id), req.user.id]);
  res.json({ ok: true });
}));

router.patch("/:id", wrap(async (req, res) => {
  const mode = req.body?.mode;
  if (!["auto", "brouillon", "jamais"].includes(mode)) throw new HttpError(400, "Mode invalide.");
  const { rows } = await query("update kora.contacts set mode = $3 where id = $1 and user_id = $2 returning *", [uuid(req.params.id), req.user.id, mode]);
  if (!rows[0]) throw new HttpError(404, "Contact introuvable.");
  res.json(rows[0]);
}));

export default router;
