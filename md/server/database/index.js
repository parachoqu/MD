import { createNeonDatabase } from "./neon-adapter.js";

let database = null;

export function getDatabase(options = {}) {
  if (database) return database;
  const connectionString = (options.unpooled ? process.env.DATABASE_URL_UNPOOLED : null)
    || process.env.DATABASE_URL
    || process.env.DATABASE_URL_UNPOOLED;
  database = createNeonDatabase(connectionString);
  return database;
}

export function setDatabaseForTests(value) {
  database = value;
}

export function clearDatabaseForTests() {
  database = null;
}
