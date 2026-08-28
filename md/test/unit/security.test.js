import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../../server/security/password.js";
import { hmac, payloadHash, randomToken, safeEqual } from "../../server/security/crypto.js";
import { clearSessionCookie, sessionCookie } from "../../server/auth/session-service.js";

test("scrypt usa salt individual e comparacao valida", async () => {
  const first = await hashPassword("Senha-Forte-2026!");
  const second = await hashPassword("Senha-Forte-2026!");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("Senha-Forte-2026!", first), true);
  assert.equal(await verifyPassword("Senha-Incorreta-2026!", first), false);
  assert.equal(await verifyPassword("Senha-Forte-2026!", "invalido"), false);
});

test("politica de senha recusa valores fracos", () => {
  assert.ok(validatePasswordStrength("admin").length > 0);
  assert.deepEqual(validatePasswordStrength("Senha-Forte-2026!"), []);
});

test("tokens, HMAC e hashes sao estaveis sem expor o valor", () => {
  assert.ok(randomToken(32).length >= 43);
  assert.equal(hmac("valor", "s".repeat(32)), hmac("valor", "s".repeat(32)));
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(payloadHash({ b: 2, a: 1 }), payloadHash({ a: 1, b: 2 }));
});

test("cookie de sessao usa flags seguras em producao", () => {
  const config = { production: true, appOrigin: "https://mdeventos.site" };
  const value = sessionCookie("token", config);
  assert.match(value, /HttpOnly/);
  assert.match(value, /Secure/);
  assert.match(value, /SameSite=Strict/);
  assert.match(value, /Path=\//);
  assert.match(clearSessionCookie(config), /Max-Age=0/);
});
