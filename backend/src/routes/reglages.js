import express from "express";
import { normalizeProviderPrefs } from "../ai/providers.js";
import { query } from "../db.js";
import { HttpError, wrap } from "../middleware.js";

const router = express.Router();

export async function getReglages(userId) {
  const found = await query("select * from kora.reglages where user_id = $1", [userId]);
  if (found.rows[0]) return found.rows[0];
  const { rows } = await query(
    "insert into kora.reglages (user_id) values ($1) on conflict (user_id) do update set user_id = excluded.user_id returning *",
    [userId],
  );
  return rows[0];
}

const shape = (row) => ({ ...row, fournisseurs_ia: normalizeProviderPrefs(row.fournisseurs_ia) });

router.get("/", wrap(async (req, res) => {
  res.json(shape(await getReglages(req.user.id)));
}));

router.patch("/", wrap(async (req, res) => {
  const b = req.body ?? {};
  await getReglages(req.user.id);
  const sets = [];
  const vals = [req.user.id];
  const add = (col, val, cast = "") => { vals.push(val); sets.push(`${col} = $${vals.length}${cast}`); };

  if ("theme" in b) {
    if (!["sombre", "clair"].includes(b.theme)) throw new HttpError(400, "Thème invalide.");
    add("theme", b.theme);
  }
  if ("reponses_auto" in b) {
    if (typeof b.reponses_auto !== "boolean") throw new HttpError(400, "Valeur invalide.");
    add("reponses_auto", b.reponses_auto);
  }
  if ("pause_jusqua" in b) {
    if (b.pause_jusqua === null) add("pause_jusqua", null);
    else {
      const d = new Date(b.pause_jusqua);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, "Date invalide.");
      add("pause_jusqua", d.toISOString());
    }
  }
  if ("fournisseurs_ia" in b) {
    if (!Array.isArray(b.fournisseurs_ia)) throw new HttpError(400, "Liste invalide.");
    const list = normalizeProviderPrefs(b.fournisseurs_ia).map(({ id, actif }) => ({ id, actif }));
    add("fournisseurs_ia", JSON.stringify(list), "::jsonb");
  }
  if ("garde_fous" in b) {
    const g = b.garde_fous;
    if (!g || typeof g !== "object") throw new HttpError(400, "Garde-fous invalides.");
    add("garde_fous", JSON.stringify({
      jamais_argent: !!g.jamais_argent,
      jamais_rdv: !!g.jamais_rdv,
      confirmation_sensible: !!g.confirmation_sensible,
    }), "::jsonb");
  }
  if (!sets.length) throw new HttpError(400, "Rien à modifier.");
  const { rows } = await query(`update kora.reglages set ${sets.join(", ")}, updated_at = now() where user_id = $1 returning *`, vals);
  res.json(shape(rows[0]));
}));

export default router;
