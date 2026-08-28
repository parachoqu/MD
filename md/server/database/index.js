import { createNeonDatabase } from "./neon-adapter.js";

let database = null;

export function getDatabase() {
  if (!database) database = createNeonDatabase();
  return database;
}

export function setDatabaseForTests(value) {
  database = value;
}

export function clearDatabaseForTests() {
  database = null;
}
