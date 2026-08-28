import { assertSameOrigin } from "../security/request.js";
import { notFoundError } from "./errors.js";
import { readJson, success } from "./response.js";
import { pathSegments, requireMethod } from "./route-utils.js";
import { createPasswordResetService } from "../services/password-reset-service.js";

function cookieHeaders(cookie) {
  return cookie ? { "Set-Cookie": cookie } : {};
}

export async function handleAuthRequest(request, runtime) {
  const [action] = pathSegments(request, "/api/auth/");
  if (action === "login") {
    requireMethod(request, "POST");
    assertSameOrigin(request, runtime.config.appOrigin);
    const body = await readJson(request, { maxBytes: 16 * 1024 });
    const result = await runtime.sessions.signIn(body, request);
    return success(
      { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt },
      200,
      cookieHeaders(result.cookie)
    );
  }
  if (action === "session") {
    requireMethod(request, "GET");
    const result = await runtime.sessions.sessionInfo(request);
    return success(
      { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt },
      200,
      cookieHeaders(result.cookie)
    );
  }
  if (action === "logout") {
    requireMethod(request, "POST");
    assertSameOrigin(request, runtime.config.appOrigin);
    const session = await runtime.sessions.authenticate(request);
    runtime.sessions.assertCsrf(request, session);
    const result = await runtime.sessions.signOut(request, session);
    return success({ signedOut: true }, 200, cookieHeaders(result.cookie));
  }
  if (action === "password-reset") {
    requireMethod(request, "POST");
    assertSameOrigin(request, runtime.config.appOrigin);
    const body = await readJson(request, { maxBytes: 8 * 1024 });
    const service = createPasswordResetService(runtime.database, runtime.config);
    return success(await service.requestReset(body.email, request), 202);
  }
  throw notFoundError();
}
