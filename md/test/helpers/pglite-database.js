import { PGlite } from "@electric-sql/pglite";

function wrap(client) {
  return {
    async query(text, params = []) {
      const result = await client.query(text, params);
      return { rows: result.rows || [], rowCount: Number(result.affectedRows || result.rowCount || 0) };
    },
    async exec(text) {
      const result = await client.exec(text);
      return { rows: result?.flatMap((item) => item.rows || []) || [], rowCount: 0 };
    },
  };
}

export async function createTestDatabase() {
  const pglite = new PGlite();
  await pglite.waitReady;
  return {
    ...wrap(pglite),
    async transaction(work) {
      return pglite.transaction((tx) => work(wrap(tx)));
    },
    async close() {
      await pglite.close();
    },
  };
}
