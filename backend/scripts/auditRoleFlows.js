require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { startServer } = require("../server");

const PORT = 5107;
const BASE = `http://127.0.0.1:${PORT}`;

const makeToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );

async function request(path, token) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.status >= 200 && response.status < 400, status: response.status, body };
}

function sizeOf(body) {
  if (Array.isArray(body)) return body.length;
  if (Array.isArray(body?.data)) return body.data.length;
  if (body && typeof body === "object") return Object.keys(body).length;
  return body ? 1 : 0;
}

async function check(label, path, token, results) {
  const result = await request(path, token);
  results.push({ label, path, ...result });
  console.log(
    `${result.ok ? "PASS" : "FAIL"} ${result.status} ${label} ${path} (${sizeOf(result.body)} items)`,
  );
  if (!result.ok) {
    const message =
      result.body?.message || result.body?.error || JSON.stringify(result.body).slice(0, 200);
    console.log(`  ${message}`);
  }
  return result;
}

async function main() {
  let server;
  const results = [];
  const warnings = [];

  try {
    const { rows: admins } = await pool.query(
      "SELECT id,email,role,name FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id LIMIT 1",
    );
    const { rows: teachers } = await pool.query(
      `SELECT u.id,u.email,u.role,u.name,t.id AS teacher_id
       FROM users u JOIN teachers t ON t.user_id=u.id
       WHERE u.role='teacher' AND u.is_active=TRUE
       ORDER BY t.id LIMIT 1`,
    );
    let students = [];
    if (teachers.length) {
      const mappedStudent = await pool.query(
        `SELECT u.id,u.email,u.role,u.name,s.id AS student_id,s.class_id,s.class,s.section
         FROM users u
         JOIN students s ON s.user_id=u.id
         JOIN classes c ON (
           s.class_id = c.id
           OR (
             (s.class = c.grade OR s.class = c.class_name OR s.class = CONCAT('Class ', c.grade))
             AND s.section = c.section
           )
         )
         WHERE u.role='student'
           AND u.is_active=TRUE
           AND (
             c.teacher_id = $1
             OR EXISTS (
               SELECT 1 FROM teacher_subjects ts
               WHERE ts.teacher_id = $1
                 AND (ts.class_name = c.class_name OR ts.class_name = c.grade)
                 AND (ts.section IS NULL OR ts.section='' OR ts.section = c.section)
             )
           )
         ORDER BY s.id LIMIT 1`,
        [teachers[0].teacher_id],
      );
      students = mappedStudent.rows;
    }
    if (!students.length) {
      const fallbackStudent = await pool.query(
        `SELECT u.id,u.email,u.role,u.name,s.id AS student_id,s.class_id,s.class,s.section
         FROM users u JOIN students s ON s.user_id=u.id
         WHERE u.role='student' AND u.is_active=TRUE
         ORDER BY s.id LIMIT 1`,
      );
      students = fallbackStudent.rows;
    }

    if (!admins.length) throw new Error("No active admin user found");
    if (!teachers.length) warnings.push("No active teacher user found, teacher portal flow could not be checked.");
    if (!students.length) warnings.push("No active student user found, student portal flow could not be checked.");

    const adminToken = makeToken(admins[0]);
    const teacherToken = teachers[0] ? makeToken(teachers[0]) : null;
    const studentToken = students[0] ? makeToken(students[0]) : null;

    server = await startServer(PORT);

    await check("admin dashboard", "/api/admin/dashboard", adminToken, results);
    await check("admin students", "/api/admin/students", adminToken, results);
    await check("admin teachers", "/api/admin/teachers", adminToken, results);
    await check("admin classes", "/api/admin/classes", adminToken, results);
    await check("admin notices", "/api/admin/notices", adminToken, results);
    await check("admin fees", "/api/fees/students?limit=5", adminToken, results);
    await check("admin exams", "/api/admin/results/exams", adminToken, results);
    await check("admin examinations", "/api/examinations", adminToken, results);
    await check("admin transport", "/api/admin/transport", adminToken, results);
    await check("admin hostel", "/api/admin/hostel", adminToken, results);
    await check("admin documents", "/api/documents", adminToken, results);
    await check("admin smart attendance", "/api/smart-attendance", adminToken, results);

    if (teacherToken) {
      const classes = await check("teacher classes", "/api/teacher/classes", teacherToken, results);
      const teacherStudents = await check("teacher students", "/api/teacher/students", teacherToken, results);
      await check("teacher profile", "/api/teacher/profile", teacherToken, results);
      await check("teacher timetable", "/api/teacher/timetable", teacherToken, results);
      await check("teacher homework classes", "/api/teacher/homework-classes", teacherToken, results);
      await check("teacher result exams", "/api/teacher/result-exams", teacherToken, results);
      await check("teacher notices", "/api/teacher/notices", teacherToken, results);
      await check("teacher QR attendance", "/api/smart-attendance", teacherToken, results);

      if (classes.ok && sizeOf(classes.body) === 0) {
        warnings.push("Teacher portal works, but selected teacher has no assigned classes.");
      }
      if (teacherStudents.ok && sizeOf(teacherStudents.body) === 0) {
        warnings.push("Teacher portal works, but selected teacher has no students mapped through class/subject assignments.");
      }
    }

    if (studentToken) {
      await check("student profile", "/api/student/profile", studentToken, results);
      await check("student results", "/api/student/results", studentToken, results);
      await check("student fees", "/api/fees/student/fees", studentToken, results);
      await check("student assignments", "/api/student/assignments", studentToken, results);
      await check("student timetable", "/api/student/timetable", studentToken, results);
      const studentTeachers = await check("student teachers", "/api/student/teachers", studentToken, results);
      await check("student attendance", "/api/student/attendance", studentToken, results);
      await check("student campus services", "/api/student/campus-services", studentToken, results);
      await check("student notices", "/api/student/notices", studentToken, results);
      await check("student homework", "/api/homework/student", studentToken, results);
      await check("student library", "/api/library/student", studentToken, results);
      await check("student documents", "/api/documents/student", studentToken, results);

      if (!students[0].class_id) {
        warnings.push(`Student ${students[0].name} has no class_id, so timetable/class-teacher mapping may be partial.`);
      }
      if (studentTeachers.ok && sizeOf(studentTeachers.body) === 0) {
        warnings.push("Student portal works, but selected student's class has no mapped teacher.");
      }
    }

    const failed = results.filter((item) => !item.ok);
    console.log("\nSummary");
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Warnings: ${warnings.length}`);
    warnings.forEach((warning) => console.log(`WARN ${warning}`));

    if (failed.length) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

main();
