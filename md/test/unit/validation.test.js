import assert from "node:assert/strict";
import test from "node:test";
import { events } from "../../data/events.js";
import { eventDraftSchema } from "../../server/validation/event.js";
import { contactSubmissionSchema, registrationSubmissionSchema } from "../../server/validation/submissions.js";
import { assertStructuredJson } from "../../server/validation/common.js";

test("os tres eventos atuais passam pelo schema de servidor", () => {
  events.forEach((event) => assert.doesNotThrow(() => eventDraftSchema.parse(event)));
});

test("evento rejeita slug duplicavel/estruturalmente inseguro e HTML livre", () => {
  const invalid = structuredClone(events[0]);
  invalid.slug = "Slug Invalido";
  invalid.summary = "<script>alert(1)</script>";
  assert.equal(eventDraftSchema.safeParse(invalid).success, false);
});

test("inscricao exige consentimento e estrutura tipada", () => {
  const result = registrationSubmissionSchema.safeParse({
    eventSlug: "evento-demonstrativo-inscricoes-abertas",
    team: { name: "Equipe A", city: "Cidade", state: "MG", institution: "" },
    responsible: { name: "Pessoa", email: "pessoa@example.test", phone: "33999999999", role: "responsavel" },
    categoryId: "sub17-misto-demo",
    participants: [{ name: "Atleta", birthDate: "2010-01-01", jerseyNumber: "" }],
    consent: true,
    regulationConsent: false,
    consentVersion: "privacy-v1",
  });
  assert.equal(result.success, true);
});

test("contato exige canal, consentimento e recusa honeypot", () => {
  const base = {
    name: "Pessoa",
    email: "pessoa@example.test",
    phone: "",
    subject: "empresas",
    message: "Gostaria de conversar sobre um projeto.",
    consent: true,
    consentVersion: "privacy-v1",
    website: "",
  };
  assert.equal(contactSubmissionSchema.safeParse(base).success, true);
  assert.equal(contactSubmissionSchema.safeParse({ ...base, website: "spam.example" }).success, false);
});

test("conteudo estruturado recusa HTML e chaves perigosas", () => {
  assert.doesNotThrow(() => assertStructuredJson({ hero: { title: "Titulo" } }));
  assert.throws(() => assertStructuredJson({ hero: { title: "<b>Titulo</b>" } }));
});
