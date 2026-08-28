import { createSessionService } from "../auth/session-service.js";
import { getConfig } from "../config.js";
import { getDatabase } from "../database/index.js";
import { assertSameOrigin } from "../security/request.js";

export function getRuntime() {
  const config = getConfig({ requireDatabase: true });
  const database = getDatabase();
  return { config, database, sessions: createSessionService(database, config) };
}

export async function requireAdmin(request, runtime, options = {}) {
  if (options.mutation) assertSameOrigin(request, runtime.config.appOrigin);
  const session = await runtime.sessions.authenticate(request);
  if (options.mutation) runtime.sessions.assertCsrf(request, session);
  return session;
}
