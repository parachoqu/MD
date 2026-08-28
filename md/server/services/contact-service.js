import { randomToken } from "../security/crypto.js";
import { contactSubmissionSchema } from "../validation/submissions.js";
import { completeIdempotency, idempotencyHashes, reserveIdempotency } from "./idempotency-service.js";

export function createContactService(database, config, options = {}) {
  const clock = options.clock || (() => new Date());

  async function submit(rawSubmission, idempotencyKey) {
    const submission = contactSubmissionSchema.parse(rawSubmission);
    const now = clock();
    const hashes = idempotencyHashes("contact", idempotencyKey, submission, config.ipHashSecret);
    return database.transaction(async (tx) => {
      const reservation = await reserveIdempotency(tx, {
        scope: "contact",
        ...hashes,
        now,
      });
      if (reservation.state === "replay") {
        return { status: reservation.status, data: reservation.body, replayed: true };
      }
      const id = `contact_${randomToken(12)}`;
      await tx.query(
        `INSERT INTO contact_messages
          (id, name, email, phone, subject, message, consent_version, consented_at,
           idempotency_key_hash, payload_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $8, $8)`,
        [
          id,
          submission.name,
          submission.email || null,
          submission.phone || null,
          submission.subject,
          submission.message,
          submission.consentVersion,
          now.toISOString(),
          hashes.keyHash,
          hashes.requestHash,
        ]
      );
      const response = { messageId: id, receivedAt: now.toISOString() };
      await completeIdempotency(tx, {
        scope: "contact",
        ...hashes,
        status: 201,
        body: response,
        resourceId: id,
      });
      return { status: 201, data: response, replayed: false };
    });
  }

  return { submit };
}
