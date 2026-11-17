import test from "node:test";
import assert from "node:assert/strict";
import { AiError, generate } from "../src/ai/index.js";
import { normalizeProviderPrefs } from "../src/ai/providers.js";

const ok = (text) => async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: text } }] }) });
const fail = (status) => async () => ({ ok: false, status, text: async () => "quota" });
const base = { system: "s", messages: [{ role: "user", content: "salut" }] };

function withKeys(keys, fn) {
  const names = ["GROQ_API_KEY", "GEMINI_API_KEY", "MISTRAL_API_KEY", "OPENROUTER_API_KEY"];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  for (const n of names) delete process.env[n];
  Object.assign(process.env, keys);
  return Promise.resolve(fn()).finally(() => {
    for (const n of names) saved[n] === undefined ? delete process.env[n] : (process.env[n] = saved[n]);
  });
}

test("normalisation : ordre gardé, inconnus retirés, nouveaux ajoutés", () =>
  withKeys({ GEMINI_API_KEY: "k" }, () => {
    const list = normalizeProviderPrefs([{ id: "gemini", actif: false }, { id: "inconnu", actif: true }, { id: "gemini", actif: true }]);
    assert.deepEqual(list.map((p) => p.id), ["gemini", "groq", "mistral", "openrouter"]);
    assert.equal(list[0].actif, false);
    assert.equal(list[0].configure, true);
    assert.equal(list[1].configure, false);
  }));

test("bascule : le 1er échoue (429), le 2e répond", () =>
  withKeys({ GROQ_API_KEY: "a", GEMINI_API_KEY: "b" }, async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(url);
      return url.includes("groq") ? fail(429)() : ok("Bonjour !")();
    };
    const r = await generate({ ...base, prefs: [], fetchImpl });
    assert.equal(r.text, "Bonjour !");
    assert.equal(r.provider, "gemini");
    assert.equal(calls.length, 2);
    assert.equal(r.attempts[0].status, 429);
  }));

test("l'ordre choisi est respecté et un fournisseur désactivé est ignoré", () =>
  withKeys({ GROQ_API_KEY: "a", GEMINI_API_KEY: "b", MISTRAL_API_KEY: "c" }, async () => {
    const prefs = [{ id: "mistral", actif: true }, { id: "groq", actif: false }, { id: "gemini", actif: true }];
    const r = await generate({ ...base, prefs, fetchImpl: ok("ok") });
    assert.equal(r.provider, "mistral");
  }));

test("sans clé configurée ou tout en échec : AiError", () =>
  withKeys({}, async () => {
    await assert.rejects(generate({ ...base, prefs: [], fetchImpl: ok("x") }), AiError);
    process.env.GROQ_API_KEY = "a";
    await assert.rejects(generate({ ...base, prefs: [], fetchImpl: fail(500) }), (e) => e instanceof AiError && e.attempts.length === 1);
  }));

test("réponse vide = échec ; balises <think> retirées", () =>
  withKeys({ GROQ_API_KEY: "a" }, async () => {
    await assert.rejects(generate({ ...base, prefs: [], fetchImpl: ok("   ") }), AiError);
    const r = await generate({ ...base, prefs: [], fetchImpl: ok("<think>hmm</think>Salut") });
    assert.equal(r.text, "Salut");
  }));
