// Bootstrap do painel administrativo: semeia os dados demonstrativos, exige
// sessao valida, monta o App Shell, inicia o router e liga o guard de
// beforeunload. Mesma filosofia de orquestracao explicita de js/main.js no site
// publico.

import { ensureSeeded } from "./data/admin-seed.js";
import { requireSession, watchSession } from "./auth/auth-guard.js";
import { initShell } from "./admin-shell.js";
import { initRouter } from "./admin-router.js";
import { installBeforeUnloadGuard } from "./dirty-guard.js";

async function bootstrap() {
  await ensureSeeded();

  const session = await requireSession();
  if (!session) return; // requireSession ja redirecionou para login.html

  const shell = initShell(session);
  installBeforeUnloadGuard();
  watchSession();
  initRouter(shell);
}

bootstrap();
