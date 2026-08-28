// Autenticacao simulada. NAO E SEGURANCA REAL: a conta fixa abaixo e so um par
// de credenciais de demonstracao comparado em JavaScript executado no navegador
// do proprio usuario. Qualquer pessoa com DevTools pode ler este arquivo, editar
// sessionStorage manualmente ou pular a validacao. Ver README para os requisitos
// de autenticacao real da fase de backend (cookie HttpOnly/Secure/SameSite,
// autorizacao server-side, RBAC, CSRF, rate limiting).

import { sessionStore, localStore, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS } from "../data/admin-seed.js";
import { ok, fail } from "../result.js";

const SESSION_KEY = "md.admin.session.v1";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos, reduza aqui para testar expiracao

// Conta demonstrativa fixa (ver README "Painel administrativo frontend"). Nunca
// referenciada em value/placeholder/autocomplete do HTML de login.
const FIXED_ACCOUNT = {
  email: "admin",
  password: "admin",
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function readSession() {
  const session = sessionStore.read(SESSION_KEY, null);
  if (!session) return null;
  if (!session.expiresAt || Date.now() > session.expiresAt) {
    sessionStore.remove(SESSION_KEY);
    return null;
  }
  return session;
}

export const authService = {
  async signIn(credentials) {
    return withLatency(() => {
      const email = normalizeEmail(credentials && credentials.email);
      const password = String((credentials && credentials.password) || "");
      const matches = email === FIXED_ACCOUNT.email && password === FIXED_ACCOUNT.password;
      if (!matches) {
        return fail("invalid_credentials", "Usuário ou senha inválidos.");
      }
      const issuedAt = Date.now();
      const session = { email, issuedAt, expiresAt: issuedAt + SESSION_TTL_MS };
      sessionStore.write(SESSION_KEY, session);
      return ok(session);
    });
  },

  async signOut() {
    return withLatency(() => {
      sessionStore.remove(SESSION_KEY);
      return ok(true);
    });
  },

  async getSession() {
    return withLatency(() => ok(readSession()));
  },

  // Sempre resolve { ok: true } independente do e-mail existir, para nao expor
  // enumeracao de contas mesmo em modo demonstrativo.
  async requestPasswordReset() {
    return withLatency(() => ok(true), { minMs: 300, maxMs: 500 });
  },

  getRememberedEmail() {
    return localStore.read(STORAGE_KEYS.rememberedEmail, "");
  },

  setRememberedEmail(email) {
    if (email) {
      localStore.write(STORAGE_KEYS.rememberedEmail, normalizeEmail(email));
    } else {
      localStore.remove(STORAGE_KEYS.rememberedEmail);
    }
  },

  readSessionSync: readSession,
};
