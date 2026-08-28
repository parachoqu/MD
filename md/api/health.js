import { getConfig } from "../server/config.js";
import { getDatabase } from "../server/database/index.js";
import { AppError } from "../server/http/errors.js";
import { apiHandler, success } from "../server/http/response.js";
import { requireMethod } from "../server/http/route-utils.js";

const handler = apiHandler(async (request) => {
  requireMethod(request, "GET");
  const checkedAt = new Date().toISOString();
  try {
    const config = getConfig({ requireSecrets: false, requireDatabase: true });
    const database = getDatabase();
    await database.query("SELECT 1 AS healthy");
    return success({ status: "ok", database: "reachable", version: config.commitSha, checkedAt });
  } catch {
    throw new AppError("UNHEALTHY", "Aplicacao temporariamente indisponivel.", 503);
  }
});

export default { fetch: handler };
