const pool = require("../config/db");

async function main() {
  const { rows } = await pool.query(`
    SELECT
      ccu.table_name AS referenced_table,
      tc.table_name,
      kcu.column_name,
      tc.constraint_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.constraint_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
     AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name IN ('students', 'users')
    ORDER BY ccu.table_name, tc.table_name
  `);

  console.table(rows);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const candidate = await client.query(`
      SELECT s.id, s.user_id
      FROM students s
      ORDER BY EXISTS (
        SELECT 1 FROM fee_payment_orders fpo WHERE fpo.student_id = s.id
      ) DESC, s.id
      LIMIT 1
    `);

    if (!candidate.rows.length) {
      console.log("No student exists; dependency listing completed.");
      await client.query("ROLLBACK");
      return;
    }

    const { id, user_id: userId } = candidate.rows[0];
    await client.query("DELETE FROM fee_payment_orders WHERE student_id = $1", [id]);
    await client.query("DELETE FROM students WHERE id = $1", [id]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("ROLLBACK");
    console.log(`Student ${id} deletion passed (transaction rolled back).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
