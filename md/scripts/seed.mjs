import { createMaintenanceDatabase } from "../server/database/index.js";
import { migrateDatabase } from "../server/database/migrations.js";
import { applySeed } from "../server/services/seed-service.js";

const database = createMaintenanceDatabase();

try {
  await migrateDatabase(database);
  const counts = await applySeed(database);
  process.stdout.write(`Seed concluido: ${JSON.stringify(counts)}\n`);
} finally {
  await database.close();
}
