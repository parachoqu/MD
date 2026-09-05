import { createNeonDatabase } from "./neon-adapter.js";

let database = null;

export function getDatabase() {
  if (!database) database = createNeonDatabase();
  return database;
}

export function createMaintenanceDatabase() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString?.trim()) {
    throw new Error("DATABASE_URL_UNPOOLED nao configurada para manutencao");
  }
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL_UNPOOLED deve ser uma URL PostgreSQL direta valida");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("DATABASE_URL_UNPOOLED deve ser uma URL PostgreSQL direta valida");
  }
  if (parsed.hostname.toLowerCase().split(".")[0].endsWith("-pooler")) {
    throw new Error("DATABASE_URL_UNPOOLED deve usar o endpoint direto, sem pooler");
  }
  // Cada comando possui seu proprio pool e o fecha ao terminar.
  return createNeonDatabase(connectionString);
}

export function setDatabaseForTests(value) {
  database = value;
}

export function clearDatabaseForTests() {
  database = null;
}
