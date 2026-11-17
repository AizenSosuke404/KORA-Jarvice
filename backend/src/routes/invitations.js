import express from "express";
import crypto from "node:crypto";
import { query } from "../db.js";
import { requireAdmin, wrap } from "../middleware.js";

const router = express.Router();
router.use(requireAdmin);

// 32 caractères sans I/O/0/1 : 256 est divisible par 32, donc aucun biais.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.randomBytes(10), (b) => ALPHABET[b % 32]).join("");

router.get("/", wrap(async (req, res) => {
  const { rows } = await query(
    "select code, expires_at, created_at from kora.invitations where created_by = $1 and used_by is null and expires_at > now() order by created_at desc",
    [req.user.id],
  );
  res.json(rows);
}));

router.post("/", wrap(async (req, res) => {
  const { rows } = await query(
    "insert into kora.invitations (code, created_by, expires_at) values ($1, $2, now() + interval '7 days') returning code, expires_at, created_at",
    [newCode(), req.user.id],
  );
  res.status(201).json(rows[0]);
}));

router.delete("/:code", wrap(async (req, res) => {
  await query("delete from kora.invitations where code = $1 and created_by = $2 and used_by is null", [String(req.params.code).toUpperCase(), req.user.id]);
  res.json({ ok: true });
}));

export default router;
