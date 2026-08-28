import { createEditorialRepository } from "./editorial-repository.js";
import { eventDraftSchema } from "../validation/event.js";
import { conflictError } from "../http/errors.js";
import { randomToken } from "../security/crypto.js";

export function createEventRepository(database) {
  const base = createEditorialRepository(database, "events", eventDraftSchema);

  async function duplicate(id, actorUserId) {
    const source = await base.getAdmin(id);
    let slug = `${source.slug}-copia`;
    let attempt = 2;
    while (true) {
      try {
        return await base.create(
          { ...source, id: undefined, slug, title: `${source.title} (copia)` },
          actorUserId,
          { id: `event_${randomToken(12)}`, slug }
        );
      } catch (error) {
        if (error.code !== "SLUG_CONFLICT") throw error;
        slug = `${source.slug}-copia-${attempt}`;
        attempt += 1;
      }
    }
  }

  async function remove(id, expectedRevision, actorUserId) {
    const registrations = await database.query("SELECT 1 FROM registrations WHERE event_id = $1 LIMIT 1", [id]);
    if (registrations.rows.length) {
      throw conflictError("O evento possui inscricoes e nao pode ser excluido.");
    }
    return base.softDelete(id, expectedRevision, actorUserId);
  }

  return { ...base, duplicate, remove };
}
