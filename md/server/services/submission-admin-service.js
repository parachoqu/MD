import { AppError, conflictError, notFoundError } from "../http/errors.js";
import { recordAudit } from "../repositories/audit-repository.js";

const REGISTRATION_STATUSES = new Set(["new", "reviewing", "confirmed", "cancelled", "rejected"]);
const CONTACT_STATUSES = new Set(["new", "reading", "replied", "archived", "spam"]);

function dateIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function assertStatus(status, allowed) {
  if (!allowed.has(status)) {
    throw new AppError("VALIDATION_ERROR", "Status invalido.", 422, {
      fields: { status: "Selecione um status permitido." },
    });
  }
}

export function createSubmissionAdminService(database) {
  async function listRegistrations(filters = {}) {
    const values = [];
    const where = [];
    if (filters.status) {
      values.push(filters.status);
      where.push(`r.status = $${values.length}`);
    }
    if (filters.eventId) {
      values.push(filters.eventId);
      where.push(`r.event_id = $${values.length}`);
    }
    const result = await database.query(
      `SELECT r.id, r.protocol, r.event_id, e.slug AS event_slug,
              e.draft_data->>'title' AS event_title, r.category_id,
              r.registration_type, r.status, r.created_at, r.updated_at,
              rr.name AS responsible_name, rr.email AS responsible_email
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN registration_responsibles rr ON rr.registration_id = r.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY r.created_at DESC LIMIT 200`,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      protocol: row.protocol,
      eventId: row.event_id,
      eventSlug: row.event_slug,
      eventTitle: row.event_title,
      categoryId: row.category_id,
      registrationType: row.registration_type,
      status: row.status,
      responsibleName: row.responsible_name,
      responsibleEmail: row.responsible_email,
      createdAt: dateIso(row.created_at),
      updatedAt: dateIso(row.updated_at),
    }));
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
        `SELECT id, member_type, name, birth_date, jersey_number, role, sort_order, created_at
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
        birthDate: item.birth_date ? String(item.birth_date).slice(0, 10) : null,
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
         WHERE id = $1 AND ($3::timestamptz IS NULL OR updated_at = $3::timestamptz)
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
    const result = await database.query(
      `SELECT id, name, email, phone, subject, status, created_at, updated_at
       FROM contact_messages ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY created_at DESC LIMIT 200`,
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
         WHERE id = $1 AND ($3::timestamptz IS NULL OR updated_at = $3::timestamptz)
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
    getRegistration,
    updateRegistrationStatus,
    listContacts,
    getContact,
    updateContactStatus,
  };
}
