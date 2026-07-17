require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { startServer } = require("../server");

const PORT = 5113;
const BASE = `http://127.0.0.1:${PORT}`;

const tokenFor = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );

async function request(path, token, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Connection: "close",
      ...(options.headers || {}),
    },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function main() {
  let server;
  let examId;
  let resultId;
  let feeId;
  let originalPaid;
  try {
    const student = (
      await pool.query(`
        SELECT s.id AS student_id, s.class, s.section, u.id AS user_id,
               u.email, u.name, sf.id AS fee_id, sf.academic_year,
               sf.paid_amount, sf.total_fees
        FROM students s
        JOIN users u ON u.id=s.user_id AND u.is_active=TRUE
        JOIN student_fees sf ON sf.student_id=s.id
        WHERE COALESCE(s.is_active, TRUE)=TRUE
        ORDER BY s.id LIMIT 1
      `)
    ).rows[0];
    const admin = (
      await pool.query(
        "SELECT id,email,name,role FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id LIMIT 1",
      )
    ).rows[0];
    if (!student || !admin) throw new Error("An active student fee record and admin are required");

    feeId = student.fee_id;
    originalPaid = Number(student.paid_amount || 0);
    const requiredAmount = originalPaid + 10;
    const exam = await pool.query(
      `INSERT INTO exams
         (name,exam_type,academic_year,class,section,status,default_total_marks,
          created_by,fee_clearance_required,fee_clearance_mode,fee_required_amount)
       VALUES ('Fee Clearance Audit','Audit',$1,$2,$3,'draft',100,$4,TRUE,'amount',$5)
       RETURNING id`,
      [student.academic_year, student.class, student.section, admin.id, requiredAmount],
    );
    examId = exam.rows[0].id;
    const result = await pool.query(
      `INSERT INTO results
         (student_id,subject,marks_obtained,total_marks,exam_type,exam_id,grade,published)
       VALUES ($1,'Audit Subject',80,100,'Audit',$2,'A',FALSE) RETURNING id`,
      [student.student_id, examId],
    );
    resultId = result.rows[0].id;
    server = await startServer(PORT);

    const studentToken = tokenFor({
      id: student.user_id,
      email: student.email,
      name: student.name,
      role: "student",
    });
    const adminToken = tokenFor(admin);

    const published = await request(
      `/api/admin/results/exams/${examId}/publish`,
      adminToken,
      { method: "POST" },
    );
    if (
      published.status !== 200 ||
      published.body.fee_clearance?.blocked < 1 ||
      !published.body.message?.includes("locked")
    ) {
      throw new Error("Publish response did not report fee-locked results");
    }
    console.log("PASS publish reports available and fee-locked result counts");

    const locked = await request("/api/student/results", studentToken);
    if (
      locked.status !== 200 ||
      !locked.body.locked_results.some((item) => Number(item.exam_id) === examId) ||
      locked.body.results.some((item) => Number(item.exam_id) === examId)
    ) {
      throw new Error("Pending-fee result was not securely locked");
    }
    console.log("PASS pending-fee result hidden and lock details returned");

    const clearance = await request(
      `/api/admin/results/exams/${examId}/fee-clearance`,
      adminToken,
    );
    if (clearance.status !== 200 || clearance.body.summary.blocked < 1) {
      throw new Error("Admin clearance dashboard did not show blocked student");
    }
    console.log("PASS admin sees blocked result and pending amount");

    const override = await request(
      `/api/admin/results/exams/${examId}/fee-clearance/${student.student_id}/override`,
      adminToken,
      {
        method: "PUT",
        body: JSON.stringify({ allowed: true, reason: "Automated audit override" }),
      },
    );
    if (override.status !== 200) throw new Error("Admin override failed");
    const overridden = await request("/api/student/results", studentToken);
    if (!overridden.body.results.some((item) => Number(item.exam_id) === examId)) {
      throw new Error("Admin override did not unlock result");
    }
    console.log("PASS audited admin override unlocks result");

    await pool.query(
      "UPDATE result_fee_overrides SET active=FALSE WHERE exam_id=$1 AND student_id=$2",
      [examId, student.student_id],
    );
    await pool.query("UPDATE student_fees SET paid_amount=$1 WHERE id=$2", [
      requiredAmount,
      feeId,
    ]);
    const paid = await request("/api/student/results", studentToken);
    if (!paid.body.results.some((item) => Number(item.exam_id) === examId)) {
      throw new Error("Completed payment did not automatically unlock result");
    }
    console.log("PASS completed payment automatically unlocks result");
  } finally {
    if (feeId != null && originalPaid != null) {
      await pool.query("UPDATE student_fees SET paid_amount=$1 WHERE id=$2", [originalPaid, feeId]).catch(() => {});
    }
    if (resultId) await pool.query("DELETE FROM results WHERE id=$1", [resultId]).catch(() => {});
    if (examId) await pool.query("DELETE FROM exams WHERE id=$1", [examId]).catch(() => {});
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
