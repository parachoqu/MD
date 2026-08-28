import { randomToken } from "../server/security/crypto.js";
import { hashPassword, validatePasswordStrength } from "../server/security/password.js";
import { getDatabase } from "../server/database/index.js";
import { migrateDatabase } from "../server/database/migrations.js";
import { createInterface } from "node:readline/promises";

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Execute este comando em um terminal interativo para informar a senha com seguranca.");
  }
  process.stdout.write(prompt);
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
      if (text === "\u0003") return finish(new Error("Operacao cancelada."));
      if (text === "\r" || text === "\n") return finish();
      if (text === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      if (!/[\u0000-\u001f]/.test(text)) value += text;
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

const terminal = createInterface({ input: process.stdin, output: process.stdout });
let database;

try {
  const email = (await terminal.question("E-mail do administrador: ")).trim().toLowerCase();
  const name = (await terminal.question("Nome do administrador: ")).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) throw new Error("E-mail invalido.");
  if (!name || name.length > 240) throw new Error("Nome invalido.");
  terminal.pause();
  const password = await readHidden("Senha (nao sera exibida): ");
  const confirmation = await readHidden("Confirme a senha: ");
  if (password !== confirmation) throw new Error("As senhas nao coincidem.");
  const errors = validatePasswordStrength(password);
  if (errors.length) throw new Error(errors.join(" "));

  database = getDatabase();
  await migrateDatabase(database);
  const existing = await database.query("SELECT id FROM admin_users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rows.length) {
    terminal.resume();
    const confirmationText = await terminal.question('A conta ja existe. Digite "ATUALIZAR" para trocar nome e senha: ');
    if (confirmationText !== "ATUALIZAR") throw new Error("Atualizacao cancelada.");
  }
  const passwordHash = await hashPassword(password);
  const id = existing.rows[0]?.id || `admin_${randomToken(12)}`;
  await database.query(
    `INSERT INTO admin_users (id, email, name, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'admin', 'active')
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
           role = 'admin', status = 'active', password_changed_at = now(), updated_at = now()`,
    [id, email, name, passwordHash]
  );
  await database.query("UPDATE admin_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [id]);
  process.stdout.write(existing.rows.length ? "Administrador atualizado e sessoes anteriores revogadas.\n" : "Administrador criado.\n");
} finally {
  terminal.close();
  if (database) await database.close();
}
