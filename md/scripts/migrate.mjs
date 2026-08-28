import { getDatabase } from "../server/database/index.js";
import { migrateDatabase } from "../server/database/migrations.js";

const database = getDatabase();

try {
  const results = await migrateDatabase(database);
  const applied = results.filter((item) => item.status === "applied").length;
  const unchanged = results.length - applied;
  process.stdout.write(`Migrations: ${applied} aplicada(s), ${unchanged} ja existente(s).\n`);
} finally {
  await database.close();
}
