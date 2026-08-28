import { AppError, conflictError, notFoundError, validationError } from "../http/errors.js";
import { randomToken } from "../security/crypto.js";
import { registrationSubmissionSchema } from "../validation/submissions.js";
import { completeIdempotency, idempotencyHashes, reserveIdempotency } from "./idempotency-service.js";

const ACTIVE_STATUSES = ["new", "reviewing", "confirmed"];

function saoPauloDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function assertRegistrationRules(event, submission, now) {
  const fields = {};
  if (event.status !== "open") fields.eventSlug = "As inscricoes deste evento nao estao abertas.";
  if (event.registrationType !== submission.registrationType) {
    fields.registrationType = "A modalidade de inscricao nao corresponde ao evento.";
  }
  if (!event.categories.some((category) => category.id === submission.categoryId)) {
    fields.categoryId = "Selecione uma categoria valida.";
  }

  const today = saoPauloDate(now);
  if (event.registrationPeriod?.start && today < event.registrationPeriod.start) {
    fields.eventSlug = "O periodo de inscricoes ainda nao comecou.";
  }
  if (event.registrationPeriod?.end && today > event.registrationPeriod.end) {
    fields.eventSlug = "O periodo de inscricoes terminou.";
  }

  const config = event.registrationConfig || {};
  const details = event.registrationDetails || {};
  const minimum = Number(config.minParticipants || 1);
  const maximum = Number(config.maxParticipants || details.maxAthletes || 0);
  const maximumStaff = Number(config.maxStaff || details.maxStaff || 0);
  if (submission.participants.length < minimum) fields.participants = `Informe pelo menos ${minimum} atleta(s).`;
  if (maximum && submission.participants.length > maximum) fields.participants = `Informe no maximo ${maximum} atleta(s).`;
  if (maximumStaff && submission.staff.length > maximumStaff) fields.staff = `Informe no maximo ${maximumStaff} membro(s) da comissao.`;

  submission.participants.forEach((member, index) => {
    if (config.birthDateRequired !== false && !member.birthDate) {
      fields[`participants.${index}.birthDate`] = "Informe a data de nascimento.";
    }
    if (config.jerseyNumberRequired && !member.jerseyNumber) {
      fields[`participants.${index}.jerseyNumber`] = "Informe o numero da camisa.";
    }
  });
  if (event.regulation?.available && !submission.regulationConsent) {
    fields.regulationConsent = "Aceite o regulamento publicado para concluir.";
  }
  if (Object.keys(fields).length) throw validationError(fields, "A inscricao nao atende as regras atuais do evento.");
}

function officialProtocol(now) {
  const date = saoPauloDate(now).replaceAll("-", "");
  const suffix = randomToken(12).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).padEnd(8, "0").toUpperCase();
  return `MD-${date}-${suffix}`;
}

function regulationTimestamp(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00-03:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function createRegistrationService(database, config, options = {}) {
  const clock = options.clock || (() => new Date());

  async function submit(rawSubmission, idempotencyKey) {
    const submission = registrationSubmissionSchema.parse(rawSubmission);
    const now = clock();
    const hashes = idempotencyHashes("registration", idempotencyKey, submission, config.ipHashSecret);

    return database.transaction(async (tx) => {
      const reservation = await reserveIdempotency(tx, {
        scope: "registration",
        ...hashes,
        now,
      });
      if (reservation.state === "replay") {
        return { status: reservation.status, data: reservation.body, replayed: true };
      }

      const eventResult = await tx.query(
        `SELECT id, slug, published_data
         FROM events
         WHERE slug = $1 AND editorial_status = 'published'
           AND published_data IS NOT NULL AND deleted_at IS NULL
         LIMIT 1 FOR UPDATE`,
        [submission.eventSlug]
      );
      const row = eventResult.rows[0];
      if (!row) throw notFoundError("Evento publicado nao encontrado.");
      const event = row.published_data;
      assertRegistrationRules(event, submission, now);

      if (event.capacity?.teams) {
        const capacity = await tx.query(
          `SELECT count(*)::int AS count FROM registrations
           WHERE event_id = $1 AND status = ANY($2::text[])`,
          [row.id, ACTIVE_STATUSES]
        );
        if (Number(capacity.rows[0].count) >= Number(event.capacity.teams)) {
          throw conflictError("A capacidade de inscricoes deste evento foi atingida.");
        }
      }

      const registrationId = `registration_${randomToken(12)}`;
      const protocol = officialProtocol(now);
      const regulationVersion = event.regulation?.version || event.regulation?.id || "sem-regulamento";
      await tx.query(
        `INSERT INTO registrations
          (id, event_id, protocol, category_id, registration_type, team_data,
           regulation_id, regulation_version, regulation_published_at,
           idempotency_key_hash, payload_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $12)`,
        [
          registrationId,
          row.id,
          protocol,
          submission.categoryId,
          submission.registrationType,
          JSON.stringify(submission.team),
          event.regulation?.id || null,
          regulationVersion,
          regulationTimestamp(event.regulation?.publishedAt),
          hashes.keyHash,
          hashes.requestHash,
          now.toISOString(),
        ]
      );
      await tx.query(
        `INSERT INTO registration_responsibles
          (id, registration_id, name, email, phone, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `responsible_${randomToken(12)}`,
          registrationId,
          submission.responsible.name,
          submission.responsible.email,
          submission.responsible.phone,
          submission.responsible.role || null,
          now.toISOString(),
        ]
      );

      let sortOrder = 0;
      for (const [memberType, members] of [["athlete", submission.participants], ["staff", submission.staff]]) {
        for (const member of members) {
          await tx.query(
            `INSERT INTO registration_members
              (id, registration_id, member_type, name, birth_date, jersey_number, role, sort_order, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              `member_${randomToken(12)}`,
              registrationId,
              memberType,
              member.name,
              member.birthDate || null,
              member.jerseyNumber || null,
              member.role || null,
              sortOrder,
              now.toISOString(),
            ]
          );
          sortOrder += 1;
        }
      }

      const consentTypes = ["accuracy", "privacy"];
      if (event.regulation?.available) consentTypes.push("regulation");
      for (const consentType of consentTypes) {
        await tx.query(
          `INSERT INTO registration_consents
            (id, registration_id, consent_type, consent_version, accepted_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [
            `consent_${randomToken(12)}`,
            registrationId,
            consentType,
            consentType === "regulation" ? regulationVersion : submission.consentVersion,
            now.toISOString(),
          ]
        );
      }

      const response = { protocol, registrationId, receivedAt: now.toISOString() };
      await completeIdempotency(tx, {
        scope: "registration",
        ...hashes,
        status: 201,
        body: response,
        resourceId: registrationId,
      });
      return { status: 201, data: response, replayed: false };
    });
  }

  return { submit };
}
