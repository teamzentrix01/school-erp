require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { startServer } = require("../server");

const PORT = 5111;
const BASE = `http://127.0.0.1:${PORT}`;

async function main() {
  let server;
  let teacher;
  let originalSalary = 0;
  const uploadedIds = [];
  try {
    const admin = (
      await pool.query(
        "SELECT id,email,role,name FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id LIMIT 1",
      )
    ).rows[0];
    const student = (
      await pool.query("SELECT id FROM students ORDER BY id LIMIT 1")
    ).rows[0];
    teacher = (
      await pool.query(
        `SELECT t.id,t.salary,t.phone,t.teacher_type,t.status,u.name
         FROM teachers t JOIN users u ON u.id=t.user_id ORDER BY t.id LIMIT 1`,
      )
    ).rows[0];
    if (!admin || !student || !teacher) {
      throw new Error("Admin, student, and teacher records are required");
    }

    originalSalary = Number(teacher.salary || 0);
    const token = jwt.sign(admin, process.env.JWT_SECRET, { expiresIn: "10m" });
    const headers = { Authorization: `Bearer ${token}`, Connection: "close" };
    server = await startServer(PORT);

    const salaryForm = new FormData();
    Object.entries({
      name: teacher.name,
      teacherType: teacher.teacher_type || "Subject Teacher",
      status: teacher.status || "Active",
      salary: String(originalSalary + 123),
    }).forEach(([key, value]) => salaryForm.append(key, value));
    const salaryResponse = await fetch(
      `${BASE}/api/admin/teachers/${teacher.id}`,
      {
        method: "PUT",
        headers,
        body: salaryForm,
      },
    );
    const salaryBody = await salaryResponse.json();
    if (!salaryResponse.ok) {
      throw new Error(`Salary API failed: ${JSON.stringify(salaryBody)}`);
    }
    const persistedSalary = Number(
      (
        await pool.query("SELECT salary FROM teachers WHERE id=$1", [
          teacher.id,
        ])
      ).rows[0].salary,
    );
    if (persistedSalary !== originalSalary + 123) {
      throw new Error("Salary did not persist");
    }
    await pool.query("UPDATE teachers SET salary=$1 WHERE id=$2", [
      originalSalary,
      teacher.id,
    ]);
    console.log("PASS teacher basic salary persistence (restored)");

    const samples = [
      {
        name: "transfer-certificate.pdf",
        mime: "application/pdf",
        documentType: "Transfer Certificate",
      },
      {
        name: "school-record.docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        documentType: "Other",
      },
    ];
    for (const sample of samples) {
      const form = new FormData();
      form.append("student_id", String(student.id));
      form.append("document_type", sample.documentType);
      form.append("title", "Upload smoke test");
      form.append(
        "file",
        new Blob(["test document"], { type: sample.mime }),
        sample.name,
      );
      const response = await fetch(`${BASE}/api/documents`, {
        method: "POST",
        headers,
        body: form,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          `${sample.name} upload failed: ${JSON.stringify(body)}`,
        );
      }
      uploadedIds.push(body.id);
      console.log(`PASS ${sample.name} upload`);
    }

    for (const id of [...uploadedIds]) {
      const response = await fetch(`${BASE}/api/documents/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error(`Could not clean document ${id}`);
      uploadedIds.splice(uploadedIds.indexOf(id), 1);
    }
    console.log("PASS uploaded test documents cleaned up");
  } finally {
    if (teacher) {
      await pool
        .query("UPDATE teachers SET salary=$1 WHERE id=$2", [
          originalSalary,
          teacher.id,
        ])
        .catch(() => {});
    }
    for (const id of uploadedIds) {
      await pool
        .query("DELETE FROM student_documents WHERE id=$1", [id])
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
