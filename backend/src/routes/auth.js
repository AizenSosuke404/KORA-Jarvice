import express from "express";
import crypto from "node:crypto";
import { config } from "../config.js";
import { query, tx } from "../db.js";
import { HttpError, auth, wrap } from "../middleware.js";
import { seedDemo } from "../seed.js";
import { hashPassword, rateLimit, signToken, verifyPassword } from "../security.js";

const router = express.Router();
const limiter = rateLimit({ windowMs: 60_000, max: 15 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCK = 740421;

function clean({ email, password, nom }) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.length > 254) throw new HttpError(400, "Adresse e-mail invalide.");
  const p = String(password ?? "");
  if (p.length < 8 || p.length > 200) throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères.");
  return { email: e, password: p, nom: String(nom ?? "").trim().slice(0, 60) || e.split("@")[0] };
}

const tokenFor = (u) => signToken({ sub: u.id }, config.jwtSecret);
const publicUser = (u) => ({ id: u.id, email: u.email, nom: u.nom, role: u.role });

async function insertUser(c, { email, nom, password, role }) {
  try {
    const { rows } = await c.query(
      "insert into kora.users (email, nom, password_hash, role) values ($1,$2,$3,$4) returning id, email, nom, role",
      [email, nom, await hashPassword(password), role],
    );
    await c.query("insert into kora.reglages (user_id) values ($1)", [rows[0].id]);
    return rows[0];
  } catch (e) {
    if (e.code === "23505") throw new HttpError(409, "Cet e-mail est déjà utilisé.");
    throw e;
  }
}

// Le frontend demande si le tout premier compte (propriétaire) doit encore être créé.
router.get("/status", wrap(async (req, res) => {
  const { rows } = await query("select count(*)::int as n from kora.users");
  res.json({ needsSetup: rows[0].n === 0 });
}));

// Création du propriétaire : possible UNE seule fois, et seulement avec SETUP_CODE.
router.post("/setup", limiter, wrap(async (req, res) => {
  if (!config.setupCode) throw new HttpError(503, "SETUP_CODE n'est pas défini sur le serveur.");
  const given = Buffer.from(String(req.body?.setupCode ?? ""));
  const expected = Buffer.from(config.setupCode);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new HttpError(403, "Code d'activation incorrect.");
  }
  const data = clean(req.body ?? {});
  const user = await tx(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [LOCK]);
    const { rows } = await c.query("select count(*)::int as n from kora.users");
    if (rows[0].n > 0) throw new HttpError(409, "Le premier compte existe déjà. Connecte-toi.");
    const u = await insertUser(c, { ...data, role: "admin" });
    await seedDemo(c, u.id);
    return u;
  });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}));

// Inscription d'un invité : uniquement avec un code d'invitation valide (pas d'inscription publique).
router.post("/register", limiter, wrap(async (req, res) => {
  const data = clean(req.body ?? {});
  const code = String(req.body?.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 10) throw new HttpError(400, "Code d'invitation invalide ou expiré.");
  const user = await tx(async (c) => {
    const { rows } = await c.query(
      "select code from kora.invitations where code = $1 and used_by is null and expires_at > now() for update",
      [code],
    );
    if (!rows[0]) throw new HttpError(400, "Code d'invitation invalide ou expiré.");
    const u = await insertUser(c, { ...data, role: "invite" });
    await c.query("update kora.invitations set used_by = $2, used_at = now() where code = $1", [code, u.id]);
    return u;
  });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}));

router.post("/login", limiter, wrap(async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const { rows } = await query("select id, email, nom, role, password_hash from kora.users where email = $1", [email]);
  const ok = rows[0] ? await verifyPassword(password, rows[0].password_hash) : false;
  if (!ok) throw new HttpError(401, "E-mail ou mot de passe incorrect.");
  res.json({ token: tokenFor(rows[0]), user: publicUser(rows[0]) });
}));

router.get("/me", auth, wrap(async (req, res) => {
  const { rows } = await query("select id, email, nom, role from kora.users where id = $1", [req.user.id]);
  if (!rows[0]) throw new HttpError(401, "Compte introuvable.");
  res.json(publicUser(rows[0]));
}));

export default router;
