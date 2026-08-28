import { conflictError, notFoundError, AppError } from "../http/errors.js";
import { recordAudit } from "./audit-repository.js";
import { randomToken } from "../security/crypto.js";

const DEFINITIONS = Object.freeze({
  events: { table: "events", entityType: "event", hasSlug: true, hasDeleted: true },
  projects: { table: "projects", entityType: "project", hasSlug: true, hasDeleted: true, hasOrder: true },
  site_pages: { table: "site_pages", entityType: "site_page", hasSlug: false, hasDeleted: false },
  site_settings: { table: "site_settings", entityType: "site_settings", hasSlug: false, hasDeleted: false },
});

function definition(name) {
  const value = DEFINITIONS[name];
  if (!value) throw new Error(`Repositorio editorial desconhecido: ${name}`);
  return value;
}

function dateIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function adminDto(row, config) {
  const data = row.draft_data && typeof row.draft_data === "object" ? row.draft_data : {};
  return {
    ...data,
    id: row.id,
    ...(config.hasSlug ? { slug: row.slug } : {}),
    ...(config.hasOrder ? { order: Number(row.sort_order || 0) } : {}),
    editorialStatus: row.editorial_status,
    revision: Number(row.revision),
    publishedRevision: Number(row.published_revision),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    publishedAt: dateIso(row.published_at),
    archivedAt: dateIso(row.archived_at),
  };
}

function publicDto(row, config) {
  const data = row.published_data && typeof row.published_data === "object" ? row.published_data : {};
  return {
    ...data,
    id: row.id,
    ...(config.hasSlug ? { slug: row.slug } : {}),
    ...(config.hasOrder ? { order: Number(row.published_sort_order ?? row.sort_order ?? 0) } : {}),
    publishedRevision: Number(row.published_revision),
    publishedAt: dateIso(row.published_at),
  };
}

function isUniqueViolation(error) {
  return error?.code === "23505" || /unique constraint/i.test(error?.message || "");
}

function normalizeDraft(data) {
  const copy = structuredClone(data);
  delete copy.id;
  delete copy.editorialStatus;
  delete copy.revision;
  delete copy.publishedRevision;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.publishedAt;
  delete copy.archivedAt;
  delete copy.order;
  return copy;
}

export function createEditorialRepository(database, name, validateDraft) {
  const config = definition(name);
  const deletedWhere = config.hasDeleted ? " AND deleted_at IS NULL" : "";

  async function getRow(id, client = database, lock = false) {
    const result = await client.query(
      `SELECT * FROM ${config.table} WHERE id = $1${deletedWhere}${lock ? " FOR UPDATE" : ""} LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async function listAdmin(filters = {}) {
    const result = await database.query(
      `SELECT * FROM ${config.table} WHERE 1=1${deletedWhere} ORDER BY updated_at DESC, id ASC`
    );
    let rows = result.rows.map((row) => adminDto(row, config));
    if (filters.editorialStatus) rows = rows.filter((item) => item.editorialStatus === filters.editorialStatus);
    if (filters.status) rows = rows.filter((item) => item.status === filters.status);
    if (filters.category) rows = rows.filter((item) => item.category === filters.category);
    if (filters.query) {
      const query = String(filters.query).trim().toLocaleLowerCase("pt-BR");
      rows = rows.filter((item) => JSON.stringify(item).toLocaleLowerCase("pt-BR").includes(query));
    }
    if (config.hasOrder) rows.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return rows;
  }

  async function getAdmin(id) {
    const row = await getRow(id);
    if (!row) throw notFoundError();
    return adminDto(row, config);
  }

  async function listPublic() {
    const order = config.hasOrder ? "published_sort_order ASC NULLS LAST, " : "";
    const result = await database.query(
      `SELECT * FROM ${config.table}
       WHERE editorial_status = 'published' AND published_data IS NOT NULL${deletedWhere}
       ORDER BY ${order}published_at DESC, id ASC`
    );
    return result.rows.map((row) => publicDto(row, config));
  }

  async function getPublicById(id) {
    const result = await database.query(
      `SELECT * FROM ${config.table}
       WHERE id = $1 AND editorial_status = 'published' AND published_data IS NOT NULL${deletedWhere}
       LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw notFoundError();
    return publicDto(row, config);
  }

  async function getPublicBySlug(slug) {
    if (!config.hasSlug) throw new Error("Repositorio sem slug");
    const result = await database.query(
      `SELECT * FROM ${config.table}
       WHERE slug = $1 AND editorial_status = 'published' AND published_data IS NOT NULL${deletedWhere}
       LIMIT 1`,
      [slug]
    );
    const row = result.rows[0];
    if (!row) throw notFoundError();
    return publicDto(row, config);
  }

  async function create(input, actorUserId, options = {}) {
    const parsed = validateDraft.parse(normalizeDraft(input));
    const data = normalizeDraft(parsed);
    const id = options.id || `${config.entityType}_${randomToken(12)}`;
    const slug = config.hasSlug ? options.slug || parsed.slug : null;
    const sortOrder = config.hasOrder ? Number(options.sortOrder ?? 0) : null;
    const columns = ["id", "draft_data", "created_by", "updated_by"];
    const values = [id, JSON.stringify(data), actorUserId || null, actorUserId || null];
    if (config.hasSlug) {
      columns.push("slug");
      values.push(slug);
    }
    if (config.hasOrder) {
      columns.push("sort_order");
      values.push(sortOrder);
    }
    const placeholders = values.map((_, index) => `$${index + 1}${index === 1 ? "::jsonb" : ""}`);
    try {
      const result = await database.query(
        `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        values
      );
      await recordAudit(database, {
        actorUserId,
        action: `${config.entityType}.create`,
        entityType: config.entityType,
        entityId: id,
        newRevision: 1,
      });
      return adminDto(result.rows[0], config);
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError("SLUG_CONFLICT", "Ja existe um recurso com este slug.", 409);
      throw error;
    }
  }

  async function update(id, input, expectedRevision, actorUserId) {
    const parsed = validateDraft.parse(normalizeDraft(input));
    const data = normalizeDraft(parsed);
    const assignments = ["draft_data = $1::jsonb", "revision = revision + 1", "updated_by = $2", "updated_at = now()"];
    const values = [JSON.stringify(data), actorUserId || null];
    if (config.hasSlug) {
      values.push(parsed.slug);
      assignments.push(`slug = $${values.length}`);
    }
    values.push(id, expectedRevision);
    try {
      const result = await database.query(
        `UPDATE ${config.table} SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND revision = $${values.length}${deletedWhere}
         RETURNING *`,
        values
      );
      if (!result.rows[0]) {
        if (!(await getRow(id))) throw notFoundError();
        throw conflictError();
      }
      const dto = adminDto(result.rows[0], config);
      await recordAudit(database, {
        actorUserId,
        action: `${config.entityType}.update`,
        entityType: config.entityType,
        entityId: id,
        previousRevision: expectedRevision,
        newRevision: dto.revision,
      });
      return dto;
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError("SLUG_CONFLICT", "Ja existe um recurso com este slug.", 409);
      throw error;
    }
  }

  async function publish(id, expectedRevision, actorUserId) {
    return database.transaction(async (tx) => {
      const row = await getRow(id, tx, true);
      if (!row) throw notFoundError();
      if (Number(row.revision) !== Number(expectedRevision)) throw conflictError();
      validateDraft.parse(row.draft_data);
      const orderAssignment = config.hasOrder ? ", published_sort_order = sort_order" : "";
      const result = await tx.query(
        `UPDATE ${config.table}
         SET published_data = draft_data, editorial_status = 'published',
             published_revision = revision, published_at = now(), archived_at = NULL,
             published_by = $2, updated_by = $2, updated_at = now()${orderAssignment}
         WHERE id = $1 RETURNING *`,
        [id, actorUserId || null]
      );
      await recordAudit(tx, {
        actorUserId,
        action: `${config.entityType}.publish`,
        entityType: config.entityType,
        entityId: id,
        previousRevision: Number(row.published_revision),
        newRevision: Number(row.revision),
      });
      return adminDto(result.rows[0], config);
    });
  }

  async function archive(id, expectedRevision, actorUserId) {
    const result = await database.query(
      `UPDATE ${config.table}
       SET editorial_status = 'archived', archived_at = now(), updated_at = now(), updated_by = $3
       WHERE id = $1 AND revision = $2${deletedWhere} RETURNING *`,
      [id, expectedRevision, actorUserId || null]
    );
    if (!result.rows[0]) {
      if (!(await getRow(id))) throw notFoundError();
      throw conflictError();
    }
    await recordAudit(database, {
      actorUserId,
      action: `${config.entityType}.archive`,
      entityType: config.entityType,
      entityId: id,
      previousRevision: expectedRevision,
      newRevision: expectedRevision,
    });
    return adminDto(result.rows[0], config);
  }

  async function softDelete(id, expectedRevision, actorUserId) {
    if (!config.hasDeleted) throw new AppError("DELETE_NOT_SUPPORTED", "Exclusao nao permitida para este recurso.", 409);
    const result = await database.query(
      `UPDATE ${config.table}
       SET deleted_at = now(), updated_at = now(), updated_by = $3
       WHERE id = $1 AND revision = $2 AND editorial_status <> 'published' AND deleted_at IS NULL
       RETURNING id`,
      [id, expectedRevision, actorUserId || null]
    );
    if (!result.rows[0]) {
      const row = await getRow(id);
      if (!row) throw notFoundError();
      if (Number(row.revision) !== Number(expectedRevision)) throw conflictError();
      throw new AppError("RESOURCE_PUBLISHED", "Arquive o recurso antes de exclui-lo.", 409);
    }
    await recordAudit(database, {
      actorUserId,
      action: `${config.entityType}.delete`,
      entityType: config.entityType,
      entityId: id,
      previousRevision: expectedRevision,
      newRevision: expectedRevision,
    });
    return true;
  }

  return {
    listAdmin,
    getAdmin,
    listPublic,
    getPublicById,
    getPublicBySlug,
    create,
    update,
    publish,
    archive,
    softDelete,
    _getRow: getRow,
    _dto: (row) => adminDto(row, config),
  };
}
