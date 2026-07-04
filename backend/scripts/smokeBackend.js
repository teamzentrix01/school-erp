require("dotenv").config();

const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { startServer } = require("../server");

const checks = [
  "/api/admin/hostel",
  "/api/admin/transport",
  "/api/admin/results/exams",
  "/api/library",
  "/api/documents",
  "/api/admin/payroll/staff",
  "/api/admin/payroll/runs",
  "/api/admin/finance/dashboard",
  "/api/admin/finance/transactions",
  "/api/examinations",
  "/api/smart-attendance",
];

(async () => {
  let server;
  try {
    const admin = await pool.query(
      "SELECT id, email, role, name FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id LIMIT 1",
    );
    if (!admin.rows.length) throw new Error("No active admin user found");

    const token = jwt.sign(admin.rows[0], process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    server = await startServer(5106);
    let failed = false;
    for (const path of checks) {
      const response = await fetch(`http://127.0.0.1:5106${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.text();
      const ok = response.status >= 200 && response.status < 400;
      console.log(`${ok ? "OK" : "FAIL"} ${response.status} ${path}`);
      if (!ok) {
        failed = true;
        console.log(body.slice(0, 500));
      }
    }
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
})();
