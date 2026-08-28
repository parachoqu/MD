// Guarda de rota client-side. PROTECAO APENAS DE INTERFACE (UX): qualquer
// pessoa pode abrir o DevTools, remover este script ou editar sessionStorage
// manualmente para contornar o guard. Nao ha validacao server-side nesta fase
// -- a seguranca real so existe quando o backend passar a exigir sessao
// autenticada em cada requisicao (ver README, secao de requisitos de backend).

import { authService } from "./auth-service.js";

const CHECK_INTERVAL_MS = 60 * 1000;

export async function requireSession() {
  const result = await authService.getSession();
  if (!result.ok || !result.data) {
    window.location.href = "login.html?expired=1";
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
  const timer = setInterval(async () => {
    const result = await authService.getSession();
    if (!result.ok || !result.data) {
      window.location.href = "login.html?expired=1";
    }
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(timer);
}
