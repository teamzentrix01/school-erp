const pool = require("../config/db");

const getStaff = async (_req, res) => {
  try {
    const [staff, teachers] = await Promise.all([
      pool.query("SELECT * FROM staff_members ORDER BY name"),
      pool.query(
        `SELECT t.id,u.name,t.employee_id,t.department,t.subject,t.salary,t.status,
                t.teacher_type
         FROM teachers t JOIN users u ON u.id=t.user_id
         ORDER BY u.name`,
      ),
    ]);
    res.json({ staff: staff.rows, teachers: teachers.rows });
  } catch (error) {
    console.error("getStaff:", error);
    res.status(500).json({ message: "Failed to load employees" });
  }
};

const saveStaff = async (req, res) => {
  const {
    employee_code,
    name,
    role_title,
    department,
    phone,
    email,
    joining_date,
    base_salary = 0,
    bank_account,
    bank_ifsc,
    status = "Active",
  } = req.body;
  if (!employee_code?.trim() || !name?.trim() || !role_title?.trim()) {
    return res
      .status(400)
      .json({ message: "Employee code, name, and role are required" });
  }
  try {
    const values = [
      employee_code.trim(),
      name.trim(),
      role_title.trim(),
      department || null,
      phone || null,
      email || null,
      joining_date || null,
      Number(base_salary || 0),
      bank_account || null,
      bank_ifsc || null,
      status,
    ];
    const result = req.params.id
      ? await pool.query(
          `UPDATE staff_members SET employee_code=$1,name=$2,role_title=$3,
             department=$4,phone=$5,email=$6,joining_date=$7,base_salary=$8,
             bank_account=$9,bank_ifsc=$10,status=$11,updated_at=NOW()
           WHERE id=$12 RETURNING *`,
          [...values, req.params.id],
        )
      : await pool.query(
          `INSERT INTO staff_members
             (employee_code,name,role_title,department,phone,email,joining_date,
              base_salary,bank_account,bank_ifsc,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          values,
        );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    res.status(req.params.id ? 200 : 201).json(result.rows[0]);
  } catch (error) {
    console.error("saveStaff:", error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Employee code already exists" });
    }
    res.status(500).json({ message: "Failed to save staff member" });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM staff_members WHERE id=$1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    res.json({ message: "Staff member deleted" });
  } catch (error) {
    console.error("deleteStaff:", error);
    res.status(500).json({ message: "Failed to delete staff member" });
  }
};

const getPayrollRuns = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*,COUNT(pe.id)::int AS employee_count,
              COALESCE(SUM(pe.net_salary),0) AS total_payroll,
              COALESCE(SUM(pe.net_salary) FILTER (WHERE pe.payment_status='Paid'),0) AS paid_amount,
              COUNT(pe.id) FILTER (WHERE pe.payment_status='Paid')::int AS paid_count
       FROM payroll_runs pr
       LEFT JOIN payroll_entries pe ON pe.payroll_run_id=pr.id
       GROUP BY pr.id ORDER BY pr.year DESC,pr.month DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getPayrollRuns:", error);
    res.status(500).json({ message: "Failed to load payroll runs" });
  }
};

const getPayrollRun = async (req, res) => {
  try {
    const [run, entries] = await Promise.all([
      pool.query("SELECT * FROM payroll_runs WHERE id=$1", [req.params.id]),
      pool.query(
        "SELECT * FROM payroll_entries WHERE payroll_run_id=$1 ORDER BY employee_name",
        [req.params.id],
      ),
    ]);
    if (!run.rows.length) {
      return res.status(404).json({ message: "Payroll run not found" });
    }
    res.json({ run: run.rows[0], entries: entries.rows });
  } catch (error) {
    console.error("getPayrollRun:", error);
    res.status(500).json({ message: "Failed to load payroll" });
  }
};

const generatePayroll = async (req, res) => {
  const month = Number(req.body.month);
  const year = Number(req.body.year);
  if (month < 1 || month > 12 || year < 2000) {
    return res
      .status(400)
      .json({ message: "Valid month and year are required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const run = await client.query(
      `INSERT INTO payroll_runs(month,year,notes,processed_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT(month,year) DO UPDATE SET notes=EXCLUDED.notes,updated_at=NOW()
       RETURNING *`,
      [month, year, req.body.notes || null, req.user.id],
    );
    await client.query(
      `INSERT INTO payroll_entries
         (payroll_run_id,employee_type,employee_id,employee_name,employee_code,
          role_title,base_salary,net_salary)
       SELECT $1,'Teacher',t.id,u.name,COALESCE(t.employee_id,'T-'||t.id),
              COALESCE(t.teacher_type,'Teacher'),COALESCE(t.salary,0),COALESCE(t.salary,0)
       FROM teachers t JOIN users u ON u.id=t.user_id
       WHERE COALESCE(t.status,'Active')='Active'
       ON CONFLICT(payroll_run_id,employee_type,employee_id) DO NOTHING`,
      [run.rows[0].id],
    );
    await client.query(
      `INSERT INTO payroll_entries
         (payroll_run_id,employee_type,employee_id,employee_name,employee_code,
          role_title,base_salary,net_salary)
       SELECT $1,'Staff',id,name,employee_code,role_title,base_salary,base_salary
       FROM staff_members WHERE status='Active'
       ON CONFLICT(payroll_run_id,employee_type,employee_id) DO NOTHING`,
      [run.rows[0].id],
    );
    await client.query("COMMIT");
    res.status(201).json(run.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("generatePayroll:", error);
    res.status(500).json({ message: "Failed to generate payroll" });
  } finally {
    client.release();
  }
};

const updatePayrollEntry = async (req, res) => {
  const allowances = Number(req.body.allowances || 0);
  const deductions = Number(req.body.deductions || 0);
  if (allowances < 0 || deductions < 0) {
    return res
      .status(400)
      .json({ message: "Allowances and deductions cannot be negative" });
  }
  try {
    const result = await pool.query(
      `UPDATE payroll_entries SET allowances=$1,deductions=$2,
         net_salary=GREATEST(base_salary+$1-$2,0),remarks=$3,updated_at=NOW()
       WHERE id=$4 AND payment_status<>'Paid' RETURNING *`,
      [allowances, deductions, req.body.remarks || null, req.params.id],
    );
    if (!result.rows.length) {
      return res.status(409).json({ message: "Paid entry cannot be edited" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updatePayrollEntry:", error);
    res.status(500).json({ message: "Failed to update payroll entry" });
  }
};

const payPayrollEntry = async (req, res) => {
  const hasSalaryAdjustments =
    req.body.allowances !== undefined || req.body.deductions !== undefined;
  const allowances = hasSalaryAdjustments
    ? Number(req.body.allowances || 0)
    : null;
  const deductions = hasSalaryAdjustments
    ? Number(req.body.deductions || 0)
    : null;
  if (
    hasSalaryAdjustments &&
    (Number.isNaN(allowances) ||
      Number.isNaN(deductions) ||
      allowances < 0 ||
      deductions < 0)
  ) {
    return res
      .status(400)
      .json({ message: "Allowances and deductions cannot be negative" });
  }
  try {
    const result = await pool.query(
      `UPDATE payroll_entries SET
         allowances=CASE WHEN $1::boolean THEN $2 ELSE allowances END,
         deductions=CASE WHEN $1::boolean THEN $3 ELSE deductions END,
         net_salary=CASE
           WHEN $1::boolean THEN GREATEST(base_salary+$2-$3,0)
           ELSE net_salary
         END,
         remarks=COALESCE($4,remarks),
         payment_status='Paid',
         payment_date=COALESCE($5,CURRENT_DATE),payment_mode=$6,
         transaction_reference=$7,updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [
        hasSalaryAdjustments,
        allowances,
        deductions,
        req.body.remarks || null,
        req.body.payment_date || null,
        req.body.payment_mode || "Bank Transfer",
        req.body.transaction_reference || null,
        req.params.id,
      ],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Payroll entry not found" });
    }
    await pool.query(
      `UPDATE payroll_runs pr SET
         status=CASE WHEN NOT EXISTS(
           SELECT 1 FROM payroll_entries pe
           WHERE pe.payroll_run_id=pr.id AND pe.payment_status<>'Paid'
         ) THEN 'Paid' ELSE 'Processing' END,
         processed_at=NOW(),updated_at=NOW()
       WHERE pr.id=$1`,
      [result.rows[0].payroll_run_id],
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("payPayrollEntry:", error);
    res.status(500).json({ message: "Failed to record salary payment" });
  }
};

module.exports = {
  getStaff,
  saveStaff,
  deleteStaff,
  getPayrollRuns,
  getPayrollRun,
  generatePayroll,
  updatePayrollEntry,
  payPayrollEntry,
};
