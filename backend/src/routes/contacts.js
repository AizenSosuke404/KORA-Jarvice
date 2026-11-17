import express from "express";
import { query } from "../db.js";
import { HttpError, uuid, wrap } from "../middleware.js";

const router = express.Router();

router.get("/", wrap(async (req, res) => {
  const { rows } = await query("select * from kora.contacts where user_id = $1 order by nom", [req.user.id]);
  res.json(rows);
}));

router.patch("/:id", wrap(async (req, res) => {
  const mode = req.body?.mode;
  if (!["auto", "brouillon", "jamais"].includes(mode)) throw new HttpError(400, "Mode invalide.");
  const { rows } = await query("update kora.contacts set mode = $3 where id = $1 and user_id = $2 returning *", [uuid(req.params.id), req.user.id, mode]);
  if (!rows[0]) throw new HttpError(404, "Contact introuvable.");
  res.json(rows[0]);
}));

export default router;
