const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const currentAcademicYear = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
};

const getDashboard = async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const academicYear = currentAcademicYear();
  try {
    const [summary, recentPayments, recentTransactions] = await Promise.all([
      pool.query(
        `SELECT
          COALESCE((SELECT SUM(amount) FROM fee_payments WHERE status='approved' AND paid_on=$1),0) AS today_collection,
          COALESCE((SELECT SUM(amount) FROM fee_payments WHERE status='approved' AND paid_on BETWEEN $2 AND $1),0) AS month_collection,
          COALESCE((SELECT SUM(GREATEST(total_fees-paid_amount,0)) FROM student_fees WHERE academic_year=$3),0) AS pending_fees,
          (SELECT COUNT(*)::int FROM fee_payments WHERE status='pending') AS pending_approvals,
          COALESCE((SELECT SUM(amount) FROM finance_transactions WHERE transaction_type='Income' AND transaction_date BETWEEN $2 AND $1),0) AS other_income,
          COALESCE((SELECT SUM(amount) FROM finance_transactions WHERE transaction_type='Expense' AND transaction_date BETWEEN $2 AND $1),0) AS expenses,
          COALESCE((SELECT SUM(net_salary) FROM payroll_entries WHERE payment_status<>'Paid'),0) AS outstanding_payroll`,
        [today, monthStart, academicYear],
      ),
      pool.query(
        `SELECT fp.id,fp.amount,fp.paid_on,fp.payment_mode,fp.status,u.name AS student_name
         FROM fee_payments fp JOIN student_fees sf ON sf.id=fp.student_fee_id
         JOIN students s ON s.id=sf.student_id JOIN users u ON u.id=s.user_id
         ORDER BY fp.created_at DESC LIMIT 8`,
      ),
      pool.query(
        `SELECT id,transaction_date,transaction_type,category,amount,party_name
         FROM finance_transactions ORDER BY created_at DESC LIMIT 8`,
      ),
    ]);
    res.json({
      academic_year: academicYear,
      summary: summary.rows[0],
      recent_payments: recentPayments.rows,
      recent_transactions: recentTransactions.rows,
    });
  } catch (error) {
    console.error("accounts dashboard:", error);
    res.status(500).json({ message: "Failed to load accounts dashboard" });
  }
};

const listUsers = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id,u.name,u.email,u.is_active,u.created_at,
              ap.employee_code,ap.phone
       FROM users u LEFT JOIN accounts_profiles ap ON ap.user_id=u.id
       WHERE u.role='accounts' ORDER BY u.created_at DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("list accounts users:", error);
    res.status(500).json({ message: "Failed to load accounts users" });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, employee_code, phone } = req.body;
  if (!name?.trim() || !email?.trim() || !password || !employee_code?.trim()) {
    return res.status(400).json({
      message: "Name, email, password, and employee code are required",
    });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hashed = await bcrypt.hash(password, 10);
    const user = await client.query(
      `INSERT INTO users(name,email,password,role,is_active)
       VALUES($1,$2,$3,'accounts',TRUE) RETURNING id,name,email,role,is_active`,
      [name.trim(), email.trim().toLowerCase(), hashed],
    );
    await client.query(
      `INSERT INTO accounts_profiles(user_id,employee_code,phone,created_by)
       VALUES($1,$2,$3,$4)`,
      [user.rows[0].id, employee_code.trim(), phone || null, req.user.id],
    );
    await client.query("COMMIT");
    res.status(201).json(user.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Email or employee code already exists" });
    }
    console.error("create accounts user:", error);
    res.status(500).json({ message: "Failed to create accounts user" });
  } finally {
    client.release();
  }
};

const updateUser = async (req, res) => {
  const { name, email, employee_code, phone, is_active, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id FROM users WHERE id=$1 AND role='accounts'",
      [req.params.id],
    );
    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Accounts user not found" });
    }
    if (password && password.length < 8) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }
    const hashed = password ? await bcrypt.hash(password, 10) : null;
    await client.query(
      `UPDATE users SET name=COALESCE($1,name),email=COALESCE($2,email),
         is_active=COALESCE($3,is_active),password=COALESCE($4,password),updated_at=NOW()
       WHERE id=$5`,
      [
        name?.trim() || null,
        email?.trim().toLowerCase() || null,
        is_active,
        hashed,
        req.params.id,
      ],
    );
    await client.query(
      `UPDATE accounts_profiles SET employee_code=COALESCE($1,employee_code),
         phone=$2,updated_at=NOW() WHERE user_id=$3`,
      [employee_code?.trim() || null, phone || null, req.params.id],
    );
    await client.query("COMMIT");
    res.json({ message: "Accounts user updated" });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Email or employee code already exists" });
    }
    console.error("update accounts user:", error);
    res.status(500).json({ message: "Failed to update accounts user" });
  } finally {
    client.release();
  }
};

module.exports = { getDashboard, listUsers, createUser, updateUser };
