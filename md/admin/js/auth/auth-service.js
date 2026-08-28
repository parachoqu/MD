import { apiRequest, setSessionState } from "../api-client.js";

const REMEMBERED_EMAIL_KEY = "md.admin.rememberedEmail";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export const authService = {
  async signIn(credentials) {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: {
        email: normalizeEmail(credentials?.email),
        password: String(credentials?.password || ""),
      },
      csrf: false,
      timeoutMs: 20_000,
    });
    if (result.ok) setSessionState(result.data);
    return result;
  },

  async signOut() {
    const result = await apiRequest("/api/auth/logout", { method: "POST", body: {} });
    setSessionState(null);
    return result;
  },

  async getSession() {
    const result = await apiRequest("/api/auth/session", { timeoutMs: 10_000 });
    if (result.ok) setSessionState(result.data);
    return result;
  },

  async requestPasswordReset(email) {
    return apiRequest("/api/auth/password-reset", {
      method: "POST",
      body: { email: normalizeEmail(email) },
      csrf: false,
    });
  },

  getRememberedEmail() {
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  },

  setRememberedEmail(email) {
    try {
      if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizeEmail(email));
      else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Lembrar o e-mail e opcional e nunca afeta a sessao HttpOnly.
    }
  },
};
