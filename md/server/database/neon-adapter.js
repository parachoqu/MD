import { Pool } from "@neondatabase/serverless";

function normalizeResult(result) {
  return {
    rows: result?.rows || [],
    rowCount: Number(result?.rowCount || 0),
  };
}

function wrapClient(client) {
  return {
    async query(text, params = []) {
      return normalizeResult(await client.query(text, params));
    },
    async exec(text) {
      return normalizeResult(await client.query(text));
    },
  };
}

export function createNeonDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada");
  }

  const pool = new Pool({ connectionString, max: 5 });
  const database = wrapClient(pool);

  return {
    ...database,
    async transaction(work) {
      const client = await pool.connect();
      const tx = wrapClient(client);
      try {
        await client.query("BEGIN");
        const value = await work(tx);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // A falha original deve permanecer como causa da operacao.
        }
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
