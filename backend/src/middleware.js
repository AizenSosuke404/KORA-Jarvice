import { config } from "./config.js";
import { query } from "./db.js";
import { verifyToken } from "./security.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Permet d'utiliser async/await dans les routes Express 4. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token, config.jwtSecret);
  if (!payload?.sub) return res.status(401).json({ error: "Non connecté." });
  req.user = { id: payload.sub };
  next();
}

/** Le rôle est relu en base à chaque fois (jamais fait confiance au jeton). */
export const requireAdmin = wrap(async (req, res, next) => {
  const { rows } = await query("select role from kora.users where id = $1", [req.user.id]);
  if (rows[0]?.role !== "admin") throw new HttpError(403, "Réservé au propriétaire.");
  next();
});

export function uuid(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))) {
    throw new HttpError(400, "Identifiant invalide.");
  }
  return String(value);
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON invalide." });
  console.error("Erreur serveur :", err);
  res.status(500).json({ error: "Erreur serveur." });
}
