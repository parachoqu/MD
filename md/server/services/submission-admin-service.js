import { AppError, conflictError, notFoundError, validationError } from "../http/errors.js";
import { recordAudit } from "../repositories/audit-repository.js";

const REGISTRATION_STATUSES = new Set(["new", "reviewing", "confirmed", "cancelled", "rejected"]);
const CONTACT_STATUSES = new Set(["new", "reading", "replied", "archived", "spam"]);

const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const CONTACT_LIMIT = 100;

// Cursor = base64url de "<ISO-8601>|<id>". Aceita 1 a 6 casas decimais porque o
// Postgres guarda microssegundos, e o "Z" ou o deslocamento explicito evita
// depender do fuso da sessao do banco.
const CURSOR_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const CURSOR_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;

function dateIso(value) {
  return value ? new Date(value).toISOString() : null;
}

// O driver entrega timestamptz como Date do JavaScript, que so tem milissegundos,
// enquanto o Postgres guarda microssegundos. Um cursor montado a partir do Date
// ficaria ABAIXO do valor real da linha: no modo pagina a ultima linha voltaria a
// aparecer e no modo incremental o cursor nunca avancaria (repeticao infinita).
// Por isso o cursor sempre usa o valor exato, formatado pelo proprio banco com as
// seis casas que ele armazena, e a comparacao e feita pelo par (timestamp, id).
function cursorExpression(column) {
  return `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

function invalidCursor() {
  return validationError({ cursor: "Cursor de paginacao invalido. Recarregue a listagem." });
}

export function encodeCursor(isoTimestamp, id) {
  return Buffer.from(`${isoTimestamp}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  // Buffer.from ignora caracteres invalidos em base64url, entao o formato e
  // conferido antes de decodificar.
  if (!BASE64URL_PATTERN.test(raw)) throw invalidCursor();
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  const separator = decoded.indexOf("|");
  if (separator < 1) throw invalidCursor();
  const timestamp = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);
  if (!CURSOR_TIMESTAMP_PATTERN.test(timestamp) || Number.isNaN(Date.parse(timestamp))) throw invalidCursor();
  if (!CURSOR_ID_PATTERN.test(id)) throw invalidCursor();
  return { timestamp, id };
}

function normalizeLimit(value, fallback = DEFAULT_LIMIT, maximum = MAX_LIMIT) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, MIN_LIMIT), maximum);
}

function likeTerm(value) {
  // O termo digitado e texto literal: curingas do LIKE precisam ser escapados.
  return `%${String(value).replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function assertStatus(status, allowed) {
  if (!allowed.has(status)) {
    throw new AppError("VALIDATION_ERROR", "Status invalido.", 422, {
      fields: { status: "Selecione um status permitido." },
    });
  }
}

// Um responsavel por linha: sem o LATERAL, uma inscricao com dois responsaveis
// duplicaria a linha e quebraria a paginacao por keyset.
const REGISTRATION_SOURCE = `
  FROM registrations r
  JOIN events e ON e.id = r.event_id
  LEFT JOIN LATERAL (
    SELECT rr.name
    FROM registration_responsibles rr
    WHERE rr.registration_id = r.id
    ORDER BY rr.created_at, rr.id
    LIMIT 1
  ) responsible ON true`;

const MEMBER_COUNTS = `
  LEFT JOIN LATERAL (
    SELECT (count(*) FILTER (WHERE m.member_type = 'athlete'))::int AS participant_count,
           (count(*) FILTER (WHERE m.member_type = 'staff'))::int AS staff_count
    FROM registration_members m
    WHERE m.registration_id = r.id
  ) member_counts ON true`;

function registrationFilters(filters, values, options = {}) {
  const where = [];
  if (options.status !== false && filters.status) {
    values.push(filters.status);
    where.push(`r.status = $${values.length}`);
  }
  if (filters.eventId) {
    values.push(filters.eventId);
    where.push(`r.event_id = $${values.length}`);
  }
  if (filters.categoryId) {
    values.push(filters.categoryId);
    where.push(`r.category_id = $${values.length}`);
  }
  const query = String(filters.query || "").trim();
  if (query) {
    values.push(likeTerm(query));
    const position = `$${values.length}`;
    where.push(
      `(r.protocol ILIKE ${position} ESCAPE '\\'` +
        ` OR r.team_data->>'name' ILIKE ${position} ESCAPE '\\'` +
        ` OR responsible.name ILIKE ${position} ESCAPE '\\')`
    );
  }
  return where;
}

function whereClause(conditions) {
  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}

function listItem(row) {
  // Listagem carrega o minimo: sem e-mail, telefone ou data de nascimento.
  return {
    id: row.id,
    protocol: row.protocol,
    eventId: row.event_id,
    eventSlug: row.event_slug,
    eventTitle: row.event_title,
    categoryId: row.category_id,
    registrationType: row.registration_type,
    status: row.status,
    teamName: row.team_name,
    teamCity: row.team_city,
    teamState: row.team_state,
    responsibleName: row.responsible_name,
    participantCount: Number(row.participant_count || 0),
    staffCount: Number(row.staff_count || 0),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
  };
}

export function createSubmissionAdminService(database) {
  async function registrationSyncCursor(filters) {
    const values = [];
    const where = registrationFilters(filters, values);
    const result = await database.query(
      `SELECT r.id, ${cursorExpression("r.updated_at")} AS updated_cursor
       ${REGISTRATION_SOURCE}
       ${whereClause(where)}
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT 1`,
      values
    );
    const row = result.rows[0];
    return row ? encodeCursor(row.updated_cursor, row.id) : null;
  }

  async function listRegistrations(filters = {}) {
    const limit = normalizeLimit(filters.limit);
    const sync = filters.sync ? decodeCursor(filters.sync) : null;
    const cursor = !sync && filters.cursor ? decodeCursor(filters.cursor) : null;
    const values = [];
    const where = registrationFilters(filters, values);

    if (sync) {
      values.push(sync.timestamp, sync.id);
      where.push(`(r.updated_at, r.id) > ($${values.length - 1}::timestamptz, $${values.length}::text)`);
    } else if (cursor) {
      values.push(cursor.timestamp, cursor.id);
      where.push(`(r.created_at, r.id) < ($${values.length - 1}::timestamptz, $${values.length}::text)`);
    }

    // Uma linha a mais que o limite responde `hasMore` sem contar a base inteira.
    values.push(limit + 1);
    const result = await database.query(
      `SELECT r.id, r.protocol, r.event_id, e.slug AS event_slug,
              e.draft_data->>'title' AS event_title, r.category_id,
              r.registration_type, r.status,
              r.team_data->>'name' AS team_name,
              r.team_data->>'city' AS team_city,
              r.team_data->>'state' AS team_state,
              responsible.name AS responsible_name,
              member_counts.participant_count, member_counts.staff_count,
              r.created_at, r.updated_at,
              ${cursorExpression("r.created_at")} AS created_cursor,
              ${cursorExpression("r.updated_at")} AS updated_cursor
       ${REGISTRATION_SOURCE}
       ${MEMBER_COUNTS}
       ${whereClause(where)}
       ORDER BY ${sync ? "r.updated_at ASC, r.id ASC" : "r.created_at DESC, r.id DESC"}
       LIMIT $${values.length}`,
      values
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const last = rows[rows.length - 1];
    const items = rows.map(listItem);

    if (sync) {
      return {
        mode: "sync",
        items,
        limit,
        hasMore,
        // Sem novidade o cliente repete o mesmo cursor na proxima rodada.
        syncCursor: last ? encodeCursor(last.updated_cursor, last.id) : filters.sync,
      };
    }
    return {
      mode: "page",
      items,
      limit,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.created_cursor, last.id) : null,
      syncCursor: await registrationSyncCursor(filters),
    };
  }

  async function registrationMetrics(filters = {}) {
    // O filtro de status nao entra: a metrica e justamente a contagem por status.
    const values = [];
    const where = registrationFilters(filters, values, { status: false });
    const result = await database.query(
      `SELECT r.status, count(*)::int AS total
       ${REGISTRATION_SOURCE}
       ${whereClause(where)}
       GROUP BY r.status`,
      values
    );
    const metrics = { total: 0, new: 0, reviewing: 0, confirmed: 0, cancelled: 0, rejected: 0 };
    result.rows.forEach((row) => {
      const total = Number(row.total || 0);
      metrics.total += total;
      if (REGISTRATION_STATUSES.has(row.status)) metrics[row.status] = total;
    });
    return metrics;
  }

  async function getRegistration(id) {
    const result = await database.query(
      `SELECT r.*, e.slug AS event_slug, e.draft_data->>'title' AS event_title
       FROM registrations r JOIN events e ON e.id = r.event_id
       WHERE r.id = $1 LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw notFoundError();
    const [responsibles, members, consents] = await Promise.all([
      database.query(
        "SELECT id, name, email, phone, role, created_at FROM registration_responsibles WHERE registration_id = $1 ORDER BY created_at",
        [id]
      ),
      database.query(
        // O banco formata a data: o driver entrega `date` como Date e converte-la
        // no JavaScript desloca um dia em fuso negativo.
        `SELECT id, member_type, name, to_char(birth_date, 'YYYY-MM-DD') AS birth_date,
                jersey_number, role, sort_order, created_at
         FROM registration_members WHERE registration_id = $1 ORDER BY sort_order, id`,
        [id]
      ),
      database.query(
        `SELECT id, consent_type, consent_version, accepted_at
         FROM registration_consents WHERE registration_id = $1 ORDER BY consent_type`,
        [id]
      ),
    ]);
    return {
      id: row.id,
      protocol: row.protocol,
      eventId: row.event_id,
      eventSlug: row.event_slug,
      eventTitle: row.event_title,
      categoryId: row.category_id,
      registrationType: row.registration_type,
      team: row.team_data,
      status: row.status,
      regulation: {
        id: row.regulation_id,
        version: row.regulation_version,
        publishedAt: dateIso(row.regulation_published_at),
      },
      responsibles: responsibles.rows.map((item) => ({ ...item, created_at: undefined, createdAt: dateIso(item.created_at) })),
      members: members.rows.map((item) => ({
        id: item.id,
        type: item.member_type,
        name: item.name,
        birthDate: item.birth_date || null,
        jerseyNumber: item.jersey_number,
        role: item.role,
        order: Number(item.sort_order),
        createdAt: dateIso(item.created_at),
      })),
      consents: consents.rows.map((item) => ({
        id: item.id,
        type: item.consent_type,
        version: item.consent_version,
        acceptedAt: dateIso(item.accepted_at),
      })),
      createdAt: dateIso(row.created_at),
      updatedAt: dateIso(row.updated_at),
    };
  }

  async function updateRegistrationStatus(id, status, expectedUpdatedAt, actorUserId) {
    assertStatus(status, REGISTRATION_STATUSES);
    return database.transaction(async (tx) => {
      const result = await tx.query(
        `UPDATE registrations SET status = $2, updated_at = now()
         WHERE id = $1
           AND ($3::timestamptz IS NULL
                OR date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $3::timestamptz))
         RETURNING id, status, updated_at`,
        [id, status, expectedUpdatedAt || null]
      );
      if (!result.rows[0]) {
        const exists = await tx.query("SELECT 1 FROM registrations WHERE id = $1", [id]);
        if (!exists.rows.length) throw notFoundError();
        throw conflictError();
      }
      await recordAudit(tx, {
        actorUserId,
        action: "registration.status.update",
        entityType: "registration",
        entityId: id,
        metadata: { status },
      });
      return { id, status: result.rows[0].status, updatedAt: dateIso(result.rows[0].updated_at) };
    });
  }

  async function listContacts(filters = {}) {
    const values = [];
    const where = [];
    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }
    values.push(normalizeLimit(filters.limit, CONTACT_LIMIT, CONTACT_LIMIT));
    const result = await database.query(
      `SELECT id, name, email, phone, subject, status, created_at, updated_at
       FROM contact_messages ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY created_at DESC LIMIT $${values.length}`,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      status: row.status,
      createdAt: dateIso(row.created_at),
      updatedAt: dateIso(row.updated_at),
    }));
  }

  async function getContact(id) {
    const result = await database.query(
      `SELECT id, name, email, phone, subject, message, consent_version,
              consented_at, status, created_at, updated_at
       FROM contact_messages WHERE id = $1 LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw notFoundError();
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      consentVersion: row.consent_version,
      consentedAt: dateIso(row.consented_at),
      status: row.status,
      createdAt: dateIso(row.created_at),
      updatedAt: dateIso(row.updated_at),
    };
  }

  async function updateContactStatus(id, status, expectedUpdatedAt, actorUserId) {
    assertStatus(status, CONTACT_STATUSES);
    return database.transaction(async (tx) => {
      const result = await tx.query(
        `UPDATE contact_messages SET status = $2, updated_at = now()
         WHERE id = $1
           AND ($3::timestamptz IS NULL
                OR date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $3::timestamptz))
         RETURNING id, status, updated_at`,
        [id, status, expectedUpdatedAt || null]
      );
      if (!result.rows[0]) {
        const exists = await tx.query("SELECT 1 FROM contact_messages WHERE id = $1", [id]);
        if (!exists.rows.length) throw notFoundError();
        throw conflictError();
      }
      await recordAudit(tx, {
        actorUserId,
        action: "contact.status.update",
        entityType: "contact_message",
        entityId: id,
        metadata: { status },
      });
      return { id, status: result.rows[0].status, updatedAt: dateIso(result.rows[0].updated_at) };
    });
  }

  return {
    listRegistrations,
    registrationMetrics,
    getRegistration,
    updateRegistrationStatus,
    listContacts,
    getContact,
    updateContactStatus,
  };
}
