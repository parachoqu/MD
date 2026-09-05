import { randomToken } from "../server/security/crypto.js";
import { hashPassword, validatePasswordStrength } from "../server/security/password.js";
import { createMaintenanceDatabase } from "../server/database/index.js";
import { migrateDatabase } from "../server/database/migrations.js";
import { createInterface } from "node:readline/promises";

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Execute este comando em um terminal interativo para informar a senha com seguranca.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      for (const character of text) {
        if (character === "\u0003") return finish(new Error("Operacao cancelada."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
        } else if (!/[\u0000-\u001f]/.test(character)) {
          value += character;
        }
      }
    };
    process.stdin.on("data", onData);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write(prompt);
  });
}

const database = createMaintenanceDatabase();
let terminal;

try {
  terminal = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await terminal.question("E-mail do organizador: ")).trim().toLowerCase();
  const name = (await terminal.question("Nome do organizador: ")).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) throw new Error("E-mail invalido.");
  if (!name || name.length > 240) throw new Error("Nome invalido.");
  // Remova os listeners do readline antes de reativar stdin em modo oculto.
  terminal.close();
  const password = await readHidden("Senha (nao sera exibida): ");
  const confirmation = await readHidden("Confirme a senha: ");
  if (password !== confirmation) throw new Error("As senhas nao coincidem.");
  const errors = validatePasswordStrength(password);
  if (errors.length) throw new Error(errors.join(" "));

  // A migration 002 libera o papel organizer no CHECK de admin_users.
  await migrateDatabase(database);
  const existing = await database.query("SELECT id, role FROM admin_users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rows.length) {
    terminal = createInterface({ input: process.stdin, output: process.stdout });
    const confirmationText = await terminal.question(
      `A conta ja existe com o papel "${existing.rows[0].role}". Digite "ATUALIZAR" para torna-la organizadora: `
    );
    if (confirmationText !== "ATUALIZAR") throw new Error("Atualizacao cancelada.");
  }
  const passwordHash = await hashPassword(password);
  const id = existing.rows[0]?.id || `organizer_${randomToken(12)}`;
  await database.query(
    `INSERT INTO admin_users (id, email, name, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'organizer', 'active')
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
           role = 'organizer', status = 'active', password_changed_at = now(), updated_at = now()`,
    [id, email, name, passwordHash]
  );
  await database.query("UPDATE admin_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [id]);
  process.stdout.write(
    existing.rows.length ? "Organizador atualizado e sessoes anteriores revogadas.\n" : "Organizador criado.\n"
  );
  // Rastreabilidade depende de conta individual: nunca sugerir login compartilhado.
  process.stdout.write("Cada organizador precisa da propria conta: nunca compartilhe estas credenciais.\n");
} finally {
  terminal?.close();
  await database.close();
}
