const pool = require("../config/db");

const getTransactions = async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    if (from) {
      params.push(from);
      where += ` AND transaction_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND transaction_date <= $${params.length}`;
    }
    if (type) {
      params.push(type);
      where += ` AND transaction_type = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT * FROM finance_transactions ${where}
       ORDER BY transaction_date DESC,created_at DESC`,
      params,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getTransactions:", error);
    res.status(500).json({ message: "Failed to load finance transactions" });
  }
};

const saveTransaction = async (req, res) => {
  const {
    transaction_date,
    transaction_type,
    category,
    amount,
    payment_mode,
    reference_number,
    party_name,
    description,
  } = req.body;
  if (
    !["Income", "Expense"].includes(transaction_type) ||
    !category?.trim() ||
    Number(amount) < 0
  ) {
    return res.status(400).json({
      message: "Valid transaction type, category, and amount are required",
    });
  }
  try {
    const values = [
      transaction_date || new Date().toISOString().slice(0, 10),
      transaction_type,
      category.trim(),
      Number(amount),
      payment_mode || null,
      reference_number || null,
      party_name || null,
      description || null,
      req.user.id,
    ];
    const result = req.params.id
      ? await pool.query(
          `UPDATE finance_transactions SET transaction_date=$1,
             transaction_type=$2,category=$3,amount=$4,payment_mode=$5,
             reference_number=$6,party_name=$7,description=$8,
             recorded_by=$9,updated_at=NOW()
           WHERE id=$10 RETURNING *`,
          [...values, req.params.id],
        )
      : await pool.query(
          `INSERT INTO finance_transactions
             (transaction_date,transaction_type,category,amount,payment_mode,
              reference_number,party_name,description,recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          values,
        );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(req.params.id ? 200 : 201).json(result.rows[0]);
  } catch (error) {
    console.error("saveTransaction:", error);
    res.status(500).json({ message: "Failed to save transaction" });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM finance_transactions WHERE id=$1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Transaction deleted" });
  } catch (error) {
    console.error("deleteTransaction:", error);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
};

const getFinanceDashboard = async (req, res) => {
  const from = req.query.from || `${new Date().getFullYear()}-01-01`;
  const to = req.query.to || new Date().toISOString().slice(0, 10);
  try {
    const [summary, categories, trend, recent] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE((SELECT SUM(amount) FROM fee_payments
                     WHERE status='approved' AND paid_on BETWEEN $1 AND $2),0) AS fee_income,
           COALESCE((SELECT SUM(amount) FROM finance_transactions
                     WHERE transaction_type='Income' AND transaction_date BETWEEN $1 AND $2),0) AS other_income,
           COALESCE((SELECT SUM(amount) FROM finance_transactions
                     WHERE transaction_type='Expense' AND transaction_date BETWEEN $1 AND $2),0) AS operating_expenses,
           COALESCE((SELECT SUM(net_salary) FROM payroll_entries
                     WHERE payment_status='Paid' AND payment_date BETWEEN $1 AND $2),0) AS salary_expenses`,
        [from, to],
      ),
      pool.query(
        `SELECT category,transaction_type,SUM(amount) AS amount
         FROM finance_transactions
         WHERE transaction_date BETWEEN $1 AND $2
         GROUP BY category,transaction_type ORDER BY amount DESC`,
        [from, to],
      ),
      pool.query(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month',$1::date),
             date_trunc('month',$2::date),
             interval '1 month'
           ) AS month
         )
         SELECT TO_CHAR(m.month,'YYYY-MM') AS month,
           COALESCE((SELECT SUM(amount) FROM fee_payments
                     WHERE status='approved' AND date_trunc('month',paid_on)=m.month),0)
           + COALESCE((SELECT SUM(amount) FROM finance_transactions
                       WHERE transaction_type='Income'
                         AND date_trunc('month',transaction_date)=m.month),0) AS income,
           COALESCE((SELECT SUM(amount) FROM finance_transactions
                     WHERE transaction_type='Expense'
                       AND date_trunc('month',transaction_date)=m.month),0)
           + COALESCE((SELECT SUM(net_salary) FROM payroll_entries
                       WHERE payment_status='Paid'
                         AND date_trunc('month',payment_date)=m.month),0) AS expense
         FROM months m ORDER BY m.month`,
        [from, to],
      ),
      pool.query(
        `SELECT * FROM finance_transactions
         WHERE transaction_date BETWEEN $1 AND $2
         ORDER BY transaction_date DESC,created_at DESC LIMIT 10`,
        [from, to],
      ),
    ]);
    const row = summary.rows[0];
    const income = Number(row.fee_income) + Number(row.other_income);
    const expense =
      Number(row.operating_expenses) + Number(row.salary_expenses);
    res.json({
      period: { from, to },
      summary: {
        ...row,
        total_income: income,
        total_expense: expense,
        net: income - expense,
      },
      categories: categories.rows,
      trend: trend.rows,
      recent: recent.rows,
    });
  } catch (error) {
    console.error("getFinanceDashboard:", error);
    res.status(500).json({ message: "Failed to load finance dashboard" });
  }
};

module.exports = {
  getTransactions,
  saveTransaction,
  deleteTransaction,
  getFinanceDashboard,
};
