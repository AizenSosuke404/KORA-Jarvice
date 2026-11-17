import express from "express";
import { query } from "../db.js";
import { HttpError, uuid, wrap } from "../middleware.js";

const router = express.Router();

function text(value, max, what) {
  const t = String(value ?? "").trim();
  if (!t || t.length > max) throw new HttpError(400, `${what} invalide.`);
  return t;
}

router.get("/", wrap(async (req, res) => {
  const { rows } = await query("select * from kora.souvenirs where user_id = $1 order by created_at desc", [req.user.id]);
  res.json(rows);
}));

router.post("/", wrap(async (req, res) => {
  const contenu = text(req.body?.contenu, 500, "Souvenir");
  const categorie = req.body?.categorie ? text(req.body.categorie, 40, "Catégorie") : "général";
  const { rows } = await query("insert into kora.souvenirs (user_id, contenu, categorie) values ($1,$2,$3) returning *", [req.user.id, contenu, categorie]);
  res.status(201).json(rows[0]);
}));

router.patch("/:id", wrap(async (req, res) => {
  const contenu = text(req.body?.contenu, 500, "Souvenir");
  const { rows } = await query("update kora.souvenirs set contenu = $3 where id = $1 and user_id = $2 returning *", [uuid(req.params.id), req.user.id, contenu]);
  if (!rows[0]) throw new HttpError(404, "Souvenir introuvable.");
  res.json(rows[0]);
}));

router.delete("/:id", wrap(async (req, res) => {
  await query("delete from kora.souvenirs where id = $1 and user_id = $2", [uuid(req.params.id), req.user.id]);
  res.json({ ok: true });
}));

export default router;
