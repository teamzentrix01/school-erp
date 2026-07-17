require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { startServer } = require("../server");

const PORT = 5112;
const BASE = `http://127.0.0.1:${PORT}`;

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { Connection: "close", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function main() {
  let server;
  let accountUserId;
  let transactionId;
  try {
    const admin = (
      await pool.query(
        "SELECT id,email,role,name FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id LIMIT 1",
      )
    ).rows[0];
    if (!admin) throw new Error("An active admin is required");
    const adminToken = jwt.sign(admin, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });
    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    };
    server = await startServer(PORT);

    const email = `accounts.audit.${Date.now()}@example.test`;
    const create = await jsonRequest("/api/accounts/users", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "Accounts Audit User",
        email,
        password: "AuditPass123!",
        employee_code: `ACC-AUDIT-${Date.now()}`,
        phone: "9999999999",
      }),
    });
    if (create.status !== 201)
      throw new Error(`Create account failed: ${JSON.stringify(create.body)}`);
    accountUserId = create.body.id;
    console.log("PASS admin created Accounts login");

    const login = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "AuditPass123!",
        role: "accounts",
      }),
    });
    if (login.status !== 200 || login.body?.user?.role !== "accounts") {
      throw new Error(`Accounts login failed: ${JSON.stringify(login.body)}`);
    }
    const accountHeaders = {
      Authorization: `Bearer ${login.body.token}`,
      "Content-Type": "application/json",
    };
    console.log("PASS Accounts login");

    for (const path of [
      "/api/accounts/dashboard",
      "/api/fees/stats",
      "/api/fees/classes",
      "/api/admin/finance/dashboard",
      "/api/admin/payroll/runs",
    ]) {
      const result = await jsonRequest(path, { headers: accountHeaders });
      if (result.status !== 200)
        throw new Error(`${path} returned ${result.status}`);
      console.log(`PASS 200 ${path}`);
    }

    for (const path of ["/api/admin/students", "/api/documents"]) {
      const result = await jsonRequest(path, { headers: accountHeaders });
      if (result.status !== 403)
        throw new Error(`${path} should be forbidden, got ${result.status}`);
      console.log(`PASS 403 ${path}`);
    }
    const forbiddenDelete = await jsonRequest(
      "/api/admin/finance/transactions/1",
      {
        method: "DELETE",
        headers: accountHeaders,
      },
    );
    if (forbiddenDelete.status !== 403)
      throw new Error("Accounts user could delete finance data");
    console.log("PASS Accounts destructive action blocked");

    const transaction = await jsonRequest("/api/admin/finance/transactions", {
      method: "POST",
      headers: accountHeaders,
      body: JSON.stringify({
        transaction_type: "Income",
        category: "Audit Test",
        amount: 1,
        description: "Temporary Accounts role audit",
      }),
    });
    if (transaction.status !== 201)
      throw new Error("Accounts transaction creation failed");
    transactionId = transaction.body.id;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const audit = await pool.query(
      "SELECT id FROM financial_audit_logs WHERE user_id=$1 AND path='/api/admin/finance/transactions' ORDER BY id DESC LIMIT 1",
      [accountUserId],
    );
    if (!audit.rows.length)
      throw new Error("Financial audit log was not recorded");
    console.log("PASS financial audit log recorded");
  } finally {
    if (transactionId) {
      await pool
        .query("DELETE FROM finance_transactions WHERE id=$1", [transactionId])
        .catch(() => {});
    }
    if (accountUserId) {
      await pool
        .query("DELETE FROM financial_audit_logs WHERE user_id=$1", [
          accountUserId,
        ])
        .catch(() => {});
      await pool
        .query("DELETE FROM users WHERE id=$1", [accountUserId])
        .catch(() => {});
    }
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
