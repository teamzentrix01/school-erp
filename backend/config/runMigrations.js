const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const pool = require("./db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const MIGRATION_LOCK_ID = 8142026;

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Prevent two freshly deployed instances from migrating simultaneously.
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const filenames = (await fs.readdir(MIGRATIONS_DIR))
      .filter((filename) => filename.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    const { rows } = await client.query(
      "SELECT filename, checksum FROM schema_migrations",
    );
    const applied = new Map(rows.map((row) => [row.filename, row.checksum]));

    for (const filename of filenames) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, filename), "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");

      if (applied.has(filename)) {
        if (applied.get(filename) !== checksum) {
          throw new Error(
            `Applied migration ${filename} was modified; create a new migration instead`,
          );
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [filename, checksum],
        );
        await client.query("COMMIT");
        console.log(`Applied database migration: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Database migrations are up to date");
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    } finally {
      client.release();
    }
  }
}

module.exports = runMigrations;
