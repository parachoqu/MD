import { createContentRepository } from "../repositories/content-repository.js";
import { createEventRepository } from "../repositories/event-repository.js";
import { createContactService } from "../services/contact-service.js";
import { createRegistrationService } from "../services/registration-service.js";
import { readIdempotencyKey } from "../services/idempotency-service.js";
import { getIpHash, assertSameOrigin } from "../security/request.js";
import { consumeRateLimit } from "../security/rate-limit.js";
import { rateLimitError, notFoundError } from "./errors.js";
import { readJson, success } from "./response.js";
import { pathSegments, requireMethod } from "./route-utils.js";

async function consumePublicLimit(request, runtime, scope) {
  const result = await consumeRateLimit(runtime.database, scope, getIpHash(request, runtime.config.ipHashSecret));
  if (!result.allowed) throw rateLimitError(result.retryAfter);
}

export async function handlePublicRequest(request, runtime) {
  const segments = pathSegments(request, "/api/public/");
  const [resource, identifier] = segments;
  const events = createEventRepository(runtime.database);

  if (resource === "bootstrap" && !identifier) {
    requireMethod(request, "GET");
    const content = createContentRepository(runtime.database);
    const [bootstrap, eventItems] = await Promise.all([content.publicBootstrap(), events.listPublic()]);
    return success({ ...bootstrap, events: eventItems, generatedAt: new Date().toISOString() });
  }
  if (resource === "events" && !identifier) {
    requireMethod(request, "GET");
    return success(await events.listPublic());
  }
  if (resource === "events" && identifier && segments.length === 2) {
    requireMethod(request, "GET");
    return success(await events.getPublicBySlug(identifier));
  }
  if (resource === "registrations" && !identifier) {
    requireMethod(request, "POST");
    assertSameOrigin(request, runtime.config.appOrigin);
    await consumePublicLimit(request, runtime, "registration");
    const body = await readJson(request, { maxBytes: 512 * 1024 });
    const result = await createRegistrationService(runtime.database, runtime.config).submit(body, readIdempotencyKey(request));
    return success(result.data, result.status, result.replayed ? { "Idempotency-Replayed": "true" } : {});
  }
  if (resource === "contact" && !identifier) {
    requireMethod(request, "POST");
    assertSameOrigin(request, runtime.config.appOrigin);
    await consumePublicLimit(request, runtime, "contact");
    const body = await readJson(request, { maxBytes: 32 * 1024 });
    const result = await createContactService(runtime.database, runtime.config).submit(body, readIdempotencyKey(request));
    return success(result.data, result.status, result.replayed ? { "Idempotency-Replayed": "true" } : {});
  }
  throw notFoundError();
}
