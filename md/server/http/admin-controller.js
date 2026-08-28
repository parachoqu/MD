import { del } from "@vercel/blob";
import { listAudit } from "../repositories/audit-repository.js";
import { createContentRepository } from "../repositories/content-repository.js";
import { createEventRepository } from "../repositories/event-repository.js";
import { createMediaRepository } from "../repositories/media-repository.js";
import { createProjectRepository } from "../repositories/project-repository.js";
import { contentSeedPage } from "../seed-data.js";
import { getIpHash } from "../security/request.js";
import { consumeRateLimit, subjectHash } from "../security/rate-limit.js";
import { createSubmissionAdminService } from "../services/submission-admin-service.js";
import { createBlobService } from "../storage/blob-service.js";
import { AppError, notFoundError, rateLimitError } from "./errors.js";
import { json, readJson, success } from "./response.js";
import { dataFromBody, expectedRevision, pathSegments, requireMethod } from "./route-utils.js";
import { requireAdmin } from "./runtime.js";

function filtersFrom(request, names) {
  const search = new URL(request.url).searchParams;
  return Object.fromEntries(names.map((name) => [name, search.get(name) || ""]).filter(([, value]) => value));
}

async function mutationBody(request, maxBytes = 256 * 1024) {
  return readJson(request, { maxBytes });
}

async function handleEvents(request, segments, runtime, session) {
  const repository = createEventRepository(runtime.database);
  const [, id, action] = segments;
  if (!id) {
    if (request.method === "GET") return success(await repository.listAdmin(filtersFrom(request, ["query", "status", "editorialStatus"])));
    requireMethod(request, "POST");
    const body = await mutationBody(request, 512 * 1024);
    return success(await repository.create(dataFromBody(body), session.user_id), 201);
  }
  if (!action) {
    if (request.method === "GET") return success(await repository.getAdmin(id));
    if (request.method === "PUT") {
      const body = await mutationBody(request, 512 * 1024);
      return success(await repository.update(id, dataFromBody(body), expectedRevision(body), session.user_id));
    }
    if (request.method === "DELETE") {
      const body = await mutationBody(request, 16 * 1024);
      return success(await repository.remove(id, expectedRevision(body), session.user_id));
    }
    requireMethod(request, "GET", "PUT", "DELETE");
  }
  requireMethod(request, "POST");
  const body = await mutationBody(request, 16 * 1024);
  if (action === "duplicate") return success(await repository.duplicate(id, session.user_id), 201);
  if (action === "publish") return success(await repository.publish(id, expectedRevision(body), session.user_id));
  if (action === "archive") return success(await repository.archive(id, expectedRevision(body), session.user_id));
  throw notFoundError();
}

async function handleProjects(request, segments, runtime, session) {
  const repository = createProjectRepository(runtime.database);
  const [, id, action] = segments;
  if (id === "reorder" && !action) {
    requireMethod(request, "POST");
    const body = await mutationBody(request, 16 * 1024);
    if (!body.id || !["up", "down"].includes(body.direction)) {
      throw new AppError("VALIDATION_ERROR", "Movimento de projeto invalido.", 422);
    }
    return success(await repository.reorder(body.id, body.direction, expectedRevision(body), session.user_id));
  }
  if (!id) {
    if (request.method === "GET") return success(await repository.listAdmin(filtersFrom(request, ["query", "category", "editorialStatus"])));
    requireMethod(request, "POST");
    const body = await mutationBody(request, 256 * 1024);
    return success(await repository.create(dataFromBody(body), session.user_id), 201);
  }
  if (!action) {
    if (request.method === "GET") return success(await repository.getAdmin(id));
    if (request.method === "PUT") {
      const body = await mutationBody(request, 256 * 1024);
      return success(await repository.update(id, dataFromBody(body), expectedRevision(body), session.user_id));
    }
    if (request.method === "DELETE") {
      const body = await mutationBody(request, 16 * 1024);
      return success(await repository.remove(id, expectedRevision(body), session.user_id));
    }
    requireMethod(request, "GET", "PUT", "DELETE");
  }
  requireMethod(request, "POST");
  const body = await mutationBody(request, 16 * 1024);
  if (action === "duplicate") return success(await repository.duplicate(id, session.user_id), 201);
  if (action === "publish") return success(await repository.publish(id, expectedRevision(body), session.user_id));
  if (action === "archive") return success(await repository.archive(id, expectedRevision(body), session.user_id));
  throw notFoundError();
}

async function handleContent(request, segments, runtime, session) {
  const [, pageId, action] = segments;
  if (!pageId) throw notFoundError();
  const repository = createContentRepository(runtime.database);
  if (!action) {
    if (request.method === "GET") return success(await repository.getPage(pageId));
    requireMethod(request, "PUT");
    const body = await mutationBody(request, 512 * 1024);
    return success(await repository.updatePage(pageId, dataFromBody(body), expectedRevision(body), session.user_id));
  }
  requireMethod(request, "POST");
  const body = await mutationBody(request, 32 * 1024);
  if (action === "publish") return success(await repository.publishPage(pageId, expectedRevision(body), session.user_id));
  if (action === "restore") {
    const seed = contentSeedPage(pageId);
    if (!seed) throw notFoundError();
    return success(await repository.restorePage(pageId, seed, expectedRevision(body), session.user_id));
  }
  throw notFoundError();
}

async function handleSettings(request, segments, runtime, session) {
  const repository = createContentRepository(runtime.database);
  const [, action] = segments;
  if (!action) {
    if (request.method === "GET") return success(await repository.getSettings());
    requireMethod(request, "PUT");
    const body = await mutationBody(request, 64 * 1024);
    return success(await repository.updateSettings(dataFromBody(body), expectedRevision(body), session.user_id));
  }
  if (action === "publish") {
    requireMethod(request, "POST");
    const body = await mutationBody(request, 16 * 1024);
    return success(await repository.publishSettings(expectedRevision(body), session.user_id));
  }
  throw notFoundError();
}

async function handleBlobRoute(request, body, runtime, options = {}) {
  const generating = body?.type === "blob.generate-client-token";
  let session = null;
  if (generating) {
    session = await requireAdmin(request, runtime, { mutation: true });
    const limiter = await consumeRateLimit(
      runtime.database,
      "upload",
      subjectHash("upload", `${session.user_id}:${getIpHash(request, runtime.config.ipHashSecret)}`, runtime.config.ipHashSecret)
    );
    if (!limiter.allowed) throw rateLimitError(limiter.retryAfter);
  }
  const result = await createBlobService(runtime.database, runtime.config).handle(request, body, session, options);
  return json(result);
}

async function handleMedia(request, segments, runtime, session) {
  const [, id, action] = segments;
  const repository = createMediaRepository(runtime.database);
  if (id === "upload-token" && !action) {
    requireMethod(request, "POST");
    const body = await mutationBody(request, 64 * 1024);
    return handleBlobRoute(request, body, runtime, body?.type === "blob.generate-client-token" ? { operation: "upload" } : {});
  }
  if (!id) {
    requireMethod(request, "GET");
    return success(await repository.list(filtersFrom(request, ["query", "format", "kind"])));
  }
  if (action === "replace") {
    requireMethod(request, "POST");
    const body = await mutationBody(request, 64 * 1024);
    return handleBlobRoute(request, body, runtime, { operation: "replace", mediaId: id });
  }
  if (action === "usage") {
    requireMethod(request, "GET");
    return success(await repository.usage(id));
  }
  if (!action) {
    if (request.method === "GET") return success(await repository.get(id));
    if (request.method === "PUT") {
      const body = await mutationBody(request, 32 * 1024);
      return success(await repository.update(id, body, session.user_id));
    }
    if (request.method === "DELETE") {
      const body = await mutationBody(request, 16 * 1024);
      return success(
        await repository.remove(id, expectedRevision(body), session.user_id, (url) =>
          del(url, { token: runtime.config.blobToken })
        )
      );
    }
    requireMethod(request, "GET", "PUT", "DELETE");
  }
  throw notFoundError();
}

async function handleSubmissions(request, segments, runtime, session) {
  const [resource, id, action] = segments;
  const service = createSubmissionAdminService(runtime.database);
  const registrations = resource === "registrations";
  if (!id) {
    requireMethod(request, "GET");
    return success(
      registrations
        ? await service.listRegistrations(filtersFrom(request, ["status", "eventId"]))
        : await service.listContacts(filtersFrom(request, ["status"]))
    );
  }
  if (!action) {
    requireMethod(request, "GET");
    return success(registrations ? await service.getRegistration(id) : await service.getContact(id));
  }
  if (action === "status") {
    requireMethod(request, "PUT");
    const body = await mutationBody(request, 16 * 1024);
    return success(
      registrations
        ? await service.updateRegistrationStatus(id, body.status, body.updatedAt, session.user_id)
        : await service.updateContactStatus(id, body.status, body.updatedAt, session.user_id)
    );
  }
  throw notFoundError();
}

export async function handleAdminRequest(request, runtime) {
  const segments = pathSegments(request, "/api/admin/");
  if (!segments.length) throw notFoundError();
  const blobCallback = segments[0] === "media" && segments[1] === "upload-token";
  if (blobCallback && request.method === "POST") {
    const body = await mutationBody(request, 64 * 1024);
    if (body?.type === "blob.upload-completed") return handleBlobRoute(request, body, runtime);
    return handleBlobRoute(request, body, runtime, { operation: "upload" });
  }

  const mutation = !["GET", "HEAD"].includes(request.method);
  const session = await requireAdmin(request, runtime, { mutation });
  if (segments[0] === "events") return handleEvents(request, segments, runtime, session);
  if (segments[0] === "projects") return handleProjects(request, segments, runtime, session);
  if (segments[0] === "content") return handleContent(request, segments, runtime, session);
  if (segments[0] === "settings") return handleSettings(request, segments, runtime, session);
  if (segments[0] === "media") return handleMedia(request, segments, runtime, session);
  if (segments[0] === "activity") {
    requireMethod(request, "GET");
    return success(await listAudit(runtime.database, { limit: new URL(request.url).searchParams.get("limit") }));
  }
  if (["registrations", "contact-messages"].includes(segments[0])) {
    return handleSubmissions(request, segments, runtime, session);
  }
  throw notFoundError();
}
