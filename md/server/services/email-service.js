function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoString) {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return String(isoString);
  }
}

export function formatRegistrationEmailHtml({ registration, submission, event }) {
  const protocol = escapeHtml(registration.protocol || "MD-PENDENTE");
  const eventTitle = escapeHtml(event?.title || "Evento Esportivo");
  const teamName = escapeHtml(submission.team?.name || "Equipe");
  const teamCity = escapeHtml(submission.team?.city || "-");
  const teamState = escapeHtml(submission.team?.state || "-");
  const teamInst = escapeHtml(submission.team?.institution || "Não informada");
  const categoryId = escapeHtml(submission.categoryId || "-");
  const respName = escapeHtml(submission.responsible?.name || "-");
  const respEmail = escapeHtml(submission.responsible?.email || "-");
  const respPhone = escapeHtml(submission.responsible?.phone || "-");
  const respRole = escapeHtml(submission.responsible?.role || "Responsável");
  const cleanPhone = String(submission.responsible?.phone || "").replace(/\D/g, "");
  const waUrl = cleanPhone.length >= 10 ? `https://wa.me/55${cleanPhone}` : null;
  const receivedAt = formatDate(registration.receivedAt || new Date().toISOString());

  const participants = Array.isArray(submission.participants) ? submission.participants : [];
  const staff = Array.isArray(submission.staff) ? submission.staff : [];

  const athletesRows = participants
    .map(
      (p, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-size: 13px; color: #475569;">${index + 1}</td>
        <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHtml(p.name)}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #475569;">${escapeHtml(p.jerseyNumber || "-")}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #475569;">${escapeHtml(p.birthDate || "-")}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #475569;">${escapeHtml(p.role || "Atleta")}</td>
      </tr>`
    )
    .join("");

  const staffRows = staff.length
    ? staff
        .map(
          (s, index) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-size: 13px; color: #475569;">${index + 1}</td>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHtml(s.name)}</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #475569;" colspan="2">${escapeHtml(s.role || "Comissão técnica")}</td>
        </tr>`
        )
        .join("")
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Nova Inscrição Recebida</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-top: 4px solid #f97316; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f97316; font-family: ui-monospace, monospace;">M&amp;D Projetos e Eventos Desportivos</span>
      <h1 style="margin: 6px 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Nova Inscrição de Equipe</h1>
      <p style="margin: 4px 0 0; font-size: 14px; color: #94a3b8;">${eventTitle}</p>
    </div>

    <!-- Protocol Banner -->
    <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; font-family: ui-monospace, monospace; display: block;">Protocolo Oficial</span>
        <strong style="font-size: 16px; font-family: ui-monospace, monospace; color: #0f172a;">${protocol}</strong>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; color: #64748b; display: block;">Data/Hora</span>
        <span style="font-size: 13px; font-weight: 500; color: #334155;">${receivedAt}</span>
      </div>
    </div>

    <!-- Content Body -->
    <div style="padding: 24px;">
      
      <!-- Dados da Equipe -->
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px; font-family: ui-monospace, monospace; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">1. Dados da Equipe</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 35%;">Nome da Equipe:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${teamName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Cidade / Estado:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${teamCity} / ${teamState}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Instituição:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${teamInst}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Categoria:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0284c7;">${categoryId}</td>
        </tr>
      </table>

      <!-- Dados do Responsável -->
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px; font-family: ui-monospace, monospace; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">2. Responsável pela Inscrição</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 35%;">Nome:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${respName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">E-mail:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a;"><a href="mailto:${respEmail}" style="color: #0284c7; text-decoration: none;">${respEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">WhatsApp / Telefone:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">
            ${respPhone}
            ${waUrl ? `<a href="${waUrl}" style="margin-left: 8px; font-size: 12px; background: #22c55e; color: #ffffff; padding: 2px 8px; border-radius: 3px; text-decoration: none;" target="_blank">Abrir WhatsApp</a>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Função / Cargo:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${respRole}</td>
        </tr>
      </table>

      <!-- Atletas -->
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px; font-family: ui-monospace, monospace; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">
        3. Relação de Atletas (${participants.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #e2e8f0; text-align: left;">
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">#</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">Nome</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">Nº</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">Nascimento</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">Posição/Função</th>
          </tr>
        </thead>
        <tbody>
          ${athletesRows}
        </tbody>
      </table>

      <!-- Staff / Comissão técnica se houver -->
      ${
        staff.length
          ? `
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px; font-family: ui-monospace, monospace; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">
        4. Comissão Técnica (${staff.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #e2e8f0; text-align: left;">
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">#</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">Nome</th>
            <th style="padding: 8px 12px; font-size: 12px; color: #475569;" colspan="2">Função</th>
          </tr>
        </thead>
        <tbody>
          ${staffRows}
        </tbody>
      </table>`
          : ""
      }

      <!-- CTA Painel -->
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <a href="https://www.mdeventos.site/admin/index.html#events" style="display: inline-block; background-color: #f97316; color: #0f172a; font-weight: 700; font-size: 14px; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Abrir Painel Administrativo
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      Notificação gerada automaticamente pela plataforma M&amp;D Projetos e Eventos Desportivos.
    </div>

  </div>
</body>
</html>`;
}

export async function sendRegistrationNotification({ registration, submission, event, config = {} }) {
  const apiKey = config.resendApiKey || process.env.RESEND_API_KEY;
  const to = config.notificationEmailTo || process.env.NOTIFICATION_EMAIL_TO || "mdprojetoseeventos@gmail.com";
  const from = config.notificationEmailFrom || process.env.NOTIFICATION_EMAIL_FROM || "M&D Eventos <onboarding@resend.dev>";

  if (!apiKey) {
    // Fail-safe: não quebra a inscrição se a chave não estiver configurada
    return { sent: false, reason: "missing_api_key" };
  }

  const subject = `🏐 Nova Inscrição: ${submission.team?.name || "Equipe"} - ${event?.title || "Evento"} (${registration.protocol || "MD"})`;
  const html = formatRegistrationEmailHtml({ registration, submission, event });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("[EmailService] Erro ao enviar email via Resend:", response.status, body);
      return { sent: false, status: response.status, error: body };
    }

    return { sent: true, id: body?.id };
  } catch (error) {
    console.error("[EmailService] Falha na conexao com Resend:", error?.message || error);
    return { sent: false, error: error?.message || "network_error" };
  }
}
