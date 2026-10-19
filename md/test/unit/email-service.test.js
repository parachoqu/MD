import test from "node:test";
import assert from "node:assert/strict";
import { formatRegistrationEmailHtml, sendRegistrationNotification } from "../../server/services/email-service.js";

test("formata HTML de notificacao com protocolo e dados da equipe", () => {
  const html = formatRegistrationEmailHtml({
    registration: {
      protocol: "MD-20261019-ABCD1234",
      receivedAt: "2026-10-19T01:30:00.000Z",
    },
    submission: {
      team: {
        name: "Handebol Itambacuri Júnior",
        city: "Itambacuri",
        state: "MG",
        institution: "Prefeitura de Itambacuri",
      },
      responsible: {
        name: "Carlos Treinador",
        email: "carlos@example.com",
        phone: "(33) 98888-7777",
        role: "Técnico",
      },
      categoryId: "junior-masculino",
      participants: [
        { name: "Atleta 1", jerseyNumber: "10", birthDate: "2006-05-10", role: "Armador" },
        { name: "Atleta 2", jerseyNumber: "7", birthDate: "2007-02-15", role: "Ponta" },
      ],
      staff: [{ name: "Auxiliar Técnico", role: "Preparador" }],
    },
    event: {
      title: "1ª Taça Vale do Mucuri de Handebol Júnior",
    },
  });

  assert.match(html, /MD-20261019-ABCD1234/);
  assert.match(html, /Handebol Itambacuri Júnior/);
  assert.match(html, /Carlos Treinador/);
  assert.match(html, /carlos@example\.com/);
  assert.match(html, /Atleta 1/);
  assert.match(html, /Atleta 2/);
  assert.match(html, /Auxiliar Técnico/);
  assert.match(html, /https:\/\/www\.mdeventos\.site\/admin\/index\.html#events/);
});

test("retorna missing_api_key de forma segura quando RESEND_API_KEY nao esta definida", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const result = await sendRegistrationNotification({
      registration: { protocol: "MD-TEST-1" },
      submission: { team: { name: "Time Teste" } },
      event: { title: "Evento Teste" },
      config: {},
    });

    assert.equal(result.sent, false);
    assert.equal(result.reason, "missing_api_key");
  } finally {
    if (originalKey) process.env.RESEND_API_KEY = originalKey;
  }
});
