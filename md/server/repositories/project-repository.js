import { createEditorialRepository } from "./editorial-repository.js";
import { projectDraftSchema } from "../validation/project.js";
import { conflictError, notFoundError } from "../http/errors.js";
import { recordAudit } from "./audit-repository.js";

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createProjectRepository(database) {
  const base = createEditorialRepository(database, "projects", projectDraftSchema);

  async function create(input, actorUserId, options = {}) {
    const count = await database.query("SELECT count(*)::int AS count FROM projects WHERE deleted_at IS NULL");
    const slug = input.slug || slugify(input.title);
    return base.create({ ...input, slug }, actorUserId, {
      ...options,
      slug,
      sortOrder: options.sortOrder ?? count.rows[0].count,
    });
  }

  async function update(id, input, expectedRevision, actorUserId) {
    return base.update(id, { ...input, slug: input.slug || slugify(input.title) }, expectedRevision, actorUserId);
  }

  async function duplicate(id, actorUserId) {
    const source = await base.getAdmin(id);
    return create({ ...source, id: undefined, slug: undefined, title: `${source.title} (copia)` }, actorUserId);
  }

  async function reorder(id, direction, expectedRevision, actorUserId) {
    return database.transaction(async (tx) => {
      const currentResult = await tx.query(
        "SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
        [id]
      );
      const current = currentResult.rows[0];
      if (!current) throw notFoundError();
      if (Number(current.revision) !== Number(expectedRevision)) throw conflictError();
      const operator = direction === "up" ? "<" : ">";
      const order = direction === "up" ? "DESC" : "ASC";
      const neighborResult = await tx.query(
        `SELECT * FROM projects WHERE sort_order ${operator} $1 AND deleted_at IS NULL
         ORDER BY sort_order ${order} LIMIT 1 FOR UPDATE`,
        [current.sort_order]
      );
      const neighbor = neighborResult.rows[0];
      if (!neighbor) return base._dto(current);
      await tx.query("UPDATE projects SET sort_order = $2, revision = revision + 1, updated_by = $3, updated_at = now() WHERE id = $1", [
        current.id,
        neighbor.sort_order,
        actorUserId || null,
      ]);
      await tx.query("UPDATE projects SET sort_order = $2, revision = revision + 1, updated_by = $3, updated_at = now() WHERE id = $1", [
        neighbor.id,
        current.sort_order,
        actorUserId || null,
      ]);
      await recordAudit(tx, {
        actorUserId,
        action: "project.reorder",
        entityType: "project",
        entityId: id,
        previousRevision: Number(current.revision),
        newRevision: Number(current.revision) + 1,
      });
      const updated = await tx.query("SELECT * FROM projects WHERE id = $1", [id]);
      return base._dto(updated.rows[0]);
    });
  }

  return { ...base, create, update, duplicate, reorder, remove: base.softDelete };
}
