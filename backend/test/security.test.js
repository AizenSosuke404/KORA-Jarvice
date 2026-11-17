import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../src/security.js";

test("mot de passe : hash puis vérification", async () => {
  const h = await hashPassword("un-mot-de-passe");
  assert.ok(await verifyPassword("un-mot-de-passe", h));
  assert.equal(await verifyPassword("autre", h), false);
  assert.equal(await verifyPassword("x", "n'importe quoi"), false);
});

test("jeton : valide, falsifié, expiré, mauvais secret", () => {
  const secret = "s".repeat(40);
  const t = signToken({ sub: "abc" }, secret);
  assert.equal(verifyToken(t, secret).sub, "abc");
  assert.equal(verifyToken(t, "z".repeat(40)), null);
  const [h, p, s] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "admin", exp: 9999999999 })).toString("base64url");
  assert.equal(verifyToken(`${h}.${forged}.${s}`, secret), null);
  assert.equal(verifyToken(signToken({ sub: "abc" }, secret, -10), secret), null);
  assert.equal(verifyToken("pas.un.jeton", secret), null);
  assert.equal(verifyToken("", secret), null);
});
