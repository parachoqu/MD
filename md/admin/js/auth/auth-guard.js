// Guarda de experiencia do painel. A autorizacao real e repetida pelo servidor
// em toda rota /api/admin; este modulo apenas direciona a navegacao.

import { authService } from "./auth-service.js";

const CHECK_INTERVAL_MS = 60 * 1000;

export async function requireSession() {
  const result = await authService.getSession();
  if (!result.ok || !result.data) {
    const unavailable = ["offline", "timeout"].includes(result.error?.code);
    window.location.href = unavailable ? "login.html?unavailable=1" : "login.html?expired=1";
    return null;
  }
  return result.data;
}

export async function redirectIfAuthenticated() {
  const result = await authService.getSession();
  if (result.ok && result.data) {
    window.location.href = "index.html#dashboard";
    return true;
  }
  return false;
}

// Reavalia a sessao periodicamente para detectar expiracao mesmo com a aba
// parada numa unica tela, sem nenhuma troca de rota acontecendo.
export function watchSession() {
  const redirect = (unavailable = false) => {
    window.location.href = unavailable ? "login.html?unavailable=1" : "login.html?expired=1";
  };
  const onExpired = () => redirect(false);
  window.addEventListener("md:session-expired", onExpired);
  const timer = setInterval(async () => {
    const result = await authService.getSession();
    if (!result.ok || !result.data) {
      redirect(["offline", "timeout"].includes(result.error?.code));
    }
  }, CHECK_INTERVAL_MS);
  return () => {
    clearInterval(timer);
    window.removeEventListener("md:session-expired", onExpired);
  };
}
