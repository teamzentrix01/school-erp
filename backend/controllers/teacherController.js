const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const path = require("path");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

const getPublicUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SERVER_URL.replace(/\/$/, "")}/${String(value).replace(/^\//, "")}`;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// ADD THIS FUNCTION RIGHT HERE
const getAvatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const SUBJECT_COLORS = {
  Physics: { bg: "bg-violet-100", text: "text-violet-700" },
  Mathematics: { bg: "bg-sky-100", text: "text-sky-700" },
  English: { bg: "bg-rose-100", text: "text-rose-700" },
  Chemistry: { bg: "bg-emerald-100", text: "text-emerald-700" },
  History: { bg: "bg-amber-100", text: "text-amber-700" },
  Statistics: { bg: "bg-indigo-100", text: "text-indigo-700" },
  "Fine Arts": { bg: "bg-pink-100", text: "text-pink-700" },
  "Physical Ed.": { bg: "bg-teal-100", text: "text-teal-700" },
  Biology: { bg: "bg-green-100", text: "text-green-700" },
};

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
];

const getSubjectColors = (subject) =>
  SUBJECT_COLORS[subject] ?? { bg: "bg-gray-100", text: "text-gray-700" };

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const validatePhone = (value, label = "Phone") => {
  const phone = normalizePhone(value);
  if (!/^\d{10}$/.test(phone)) {
    return { error: `${label} must be exactly 10 digits` };
  }
  return { phone };
};

// ── Admin: GET /api/admin/teachers ───────────────────────────────────────────

// UPDATE getAllTeachers function - Fix the teacher_id reference
const getAllTeachers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.phone,
        t.teacher_type AS "teacherType",
        t.status,
         t.aadhar_number,        
        t.aadhar_image_url,   
        t.profile_picture,  
        t.created_at,
        u.name,
        u.email,
        (
          SELECT json_agg(
            json_build_object(
              'subject', ts.subject,
              'className', ts.class_name,
              'section', ts.section
            )
          )
          FROM teacher_subjects ts
          WHERE ts.teacher_id = t.id
        ) AS "subjectAssignments",
        (
          SELECT json_build_object(
            'class', c.grade,
            'section', c.section
          )
          FROM classes c
          WHERE c.teacher_id = t.id
          LIMIT 1
        ) AS "classTeacherAssignment"
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);

    // Format the response
    const teachers = result.rows.map((t) => ({
      id: `TCH-${String(t.id).padStart(3, "0")}`,
      dbId: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      teacherType: t.teacherType || "Subject Teacher",
      status: t.status || "Active",
      subjectAssignments: t.subjectAssignments || [],
      classTeacherClass: t.classTeacherAssignment?.class || "",
      classTeacherSection: t.classTeacherAssignment?.section || "",
      avatar: getInitials(t.name),
      avatarColor: AVATAR_COLORS[t.id % AVATAR_COLORS.length],
      aadharNumber: t.aadhar_number || "", // ← ADD
      aadharImageUrl: getPublicUrl(t.aadhar_image_url),
      profilePicture: getPublicUrl(t.profile_picture),
    }));

    res.json(teachers);
  } catch (err) {
    console.error("getAllTeachers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Admin: GET /api/admin/teachers/meta ──────────────────────────────────────

const getTeacherMeta = async (req, res) => {
  try {
    const deps = await pool.query(
      "SELECT DISTINCT department FROM teachers WHERE department IS NOT NULL ORDER BY department",
    );
    const subjs = await pool.query(
      "SELECT DISTINCT subject    FROM teachers WHERE subject    IS NOT NULL ORDER BY subject",
    );
    res.json({
      departments: deps.rows.map((r) => r.department),
      subjects: subjs.rows.map((r) => r.subject),
    });
  } catch (err) {
    console.error("getTeacherMeta:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Admin: POST /api/admin/teachers ──────────────────────────────────────────
// Expects multipart/form-data (name, email, password, phone, teacherType,
// classTeacherClass, classTeacherSection, subjectAssignments JSON string,
// profilePicture file, status)

// Add this helper function at the top of teacherController.js
const checkClassTeacherExists = async (
  client,
  grade,
  section,
  excludeTeacherId = null,
) => {
  const query = `
    SELECT c.id, c.teacher_id, u.name as teacher_name
    FROM classes c
    LEFT JOIN teachers t ON c.teacher_id = t.id
    LEFT JOIN users u ON t.user_id = u.id
    WHERE c.grade = $1 AND c.section = $2
    ${excludeTeacherId ? "AND c.teacher_id != $3" : ""}
  `;

  const params = excludeTeacherId
    ? [grade, section, excludeTeacherId]
    : [grade, section];

  const result = await client.query(query, params);
  return result.rows[0] || null;
};

// UPDATE createTeacher function
const createTeacher = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    teacherType,
    classTeacherClass,
    classTeacherSection,
    subjectAssignments,
    status,
    aadhar_number,
  } = req.body;

  const client = await pool.connect();
  try {
    const phoneCheck = validatePhone(phone);
    if (phoneCheck.error) {
      return res.status(400).json({ message: phoneCheck.error });
    }

    await client.query("BEGIN");

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'teacher') RETURNING id",
      [name, email, hashedPassword],
    );
    const userId = userResult.rows[0].id;

    // Create teacher
    const teacherResult = await client.query(
      `INSERT INTO teachers (user_id, phone, teacher_type, status, aadhar_number)
        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        userId,
        phoneCheck.phone,
        teacherType,
        status || "Active",
        aadhar_number || null,
      ],
    );
    const teacherId = teacherResult.rows[0].id;

    // Handle class teacher assignment
    if (
      (teacherType === "Class Teacher" || teacherType === "Both") &&
      classTeacherClass &&
      classTeacherSection
    ) {
      // CHECK if class already has a teacher assigned
      const existingClassTeacher = await checkClassTeacherExists(
        client,
        classTeacherClass,
        classTeacherSection,
      );

      if (existingClassTeacher && existingClassTeacher.teacher_id) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: `Class ${classTeacherClass}-${classTeacherSection} already has a class teacher: ${existingClassTeacher.teacher_name}. 
                   Please remove them first before assigning a new one.`,
        });
      }

      // Check if class already exists
      let classResult = await client.query(
        "SELECT id FROM classes WHERE grade = $1 AND section = $2",
        [classTeacherClass, classTeacherSection],
      );

      if (classResult.rows.length > 0) {
        // Update existing class with this teacher
        await client.query("UPDATE classes SET teacher_id = $1 WHERE id = $2", [
          teacherId,
          classResult.rows[0].id,
        ]);
      } else {
        // Create new class
        await client.query(
          `INSERT INTO classes (class_name, grade, section, teacher_id)
           VALUES ($1, $2, $3, $4)`,
          [
            `Class ${classTeacherClass}`,
            classTeacherClass,
            classTeacherSection,
            teacherId,
          ],
        );
      }
    }

    // Handle subject assignments (rest of your existing code)
    if (
      subjectAssignments &&
      (teacherType === "Subject Teacher" || teacherType === "Both")
    ) {
      const assignments = JSON.parse(subjectAssignments);
      for (const assignment of assignments) {
        if (assignment.subject && assignment.className && assignment.section) {
          await client.query(
            `INSERT INTO teacher_subjects (teacher_id, subject, class_name, section)
             VALUES ($1, $2, $3, $4)`,
            [
              teacherId,
              assignment.subject,
              assignment.className,
              assignment.section,
            ],
          );
        }
      }
    }

    await client.query("COMMIT");

    const finalResult = await client.query(
      `SELECT t.*, u.name, u.email 
       FROM teachers t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.id = $1`,
      [teacherId],
    );

    res.status(201).json(finalResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createTeacher:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// UPDATE updateTeacher function
const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phone,
    teacherType,
    classTeacherClass,
    classTeacherSection,
    subjectAssignments,
    status,
    aadhar_number,
  } = req.body;

  const client = await pool.connect();
  try {
    let cleanPhone = phone;
    if (phone != null && phone !== "") {
      const phoneCheck = validatePhone(phone);
      if (phoneCheck.error) {
        return res.status(400).json({ message: phoneCheck.error });
      }
      cleanPhone = phoneCheck.phone;
    }

    await client.query("BEGIN");

    // Get current teacher info
    const currentTeacher = await client.query(
      `SELECT t.*, u.name as user_name 
       FROM teachers t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.id = $1`,
      [id],
    );

    if (currentTeacher.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Update user info
    if (name && name !== currentTeacher.rows[0].user_name) {
      await client.query(
        "UPDATE users SET name = $1 WHERE id = (SELECT user_id FROM teachers WHERE id = $2)",
        [name, id],
      );
    }

    // Update teacher info
    await client.query(
      `UPDATE teachers SET
       phone         = COALESCE($1, phone),
       teacher_type  = COALESCE($2, teacher_type),
       status        = COALESCE($3, status),
       aadhar_number = COALESCE($4, aadhar_number),
       updated_at    = NOW()
     WHERE id = $5`,
      [cleanPhone, teacherType, status, aadhar_number || null, id],
    );

    // Handle class teacher assignment
    const newTeacherType = teacherType || currentTeacher.rows[0].teacher_type;

    if (newTeacherType === "Class Teacher" || newTeacherType === "Both") {
      if (classTeacherClass && classTeacherSection) {
        // CHECK if class already has a DIFFERENT teacher assigned
        const existingClassTeacher = await checkClassTeacherExists(
          client,
          classTeacherClass,
          classTeacherSection,
          parseInt(id), // Exclude current teacher from check
        );

        if (existingClassTeacher && existingClassTeacher.teacher_id) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            message: `Class ${classTeacherClass}-${classTeacherSection} already has a class teacher: ${existingClassTeacher.teacher_name}. 
                     Please remove them first before assigning a new one.`,
          });
        }

        // Check if class already exists
        let classResult = await client.query(
          "SELECT id FROM classes WHERE grade = $1 AND section = $2",
          [classTeacherClass, classTeacherSection],
        );

        if (classResult.rows.length > 0) {
          // Update existing class with this teacher
          await client.query(
            "UPDATE classes SET teacher_id = $1 WHERE id = $2",
            [id, classResult.rows[0].id],
          );
        } else {
          // Create new class
          await client.query(
            `INSERT INTO classes (class_name, grade, section, teacher_id)
             VALUES ($1, $2, $3, $4)`,
            [
              `Class ${classTeacherClass}`,
              classTeacherClass,
              classTeacherSection,
              id,
            ],
          );
        }
      }
    } else {
      // If teacher is no longer a class teacher, remove them from classes
      await client.query(
        "UPDATE classes SET teacher_id = NULL WHERE teacher_id = $1",
        [id],
      );
    }

    // Handle subject assignments
    if (subjectAssignments) {
      await client.query("DELETE FROM teacher_subjects WHERE teacher_id = $1", [
        id,
      ]);

      const assignments = JSON.parse(subjectAssignments);
      for (const assignment of assignments) {
        if (assignment.subject && assignment.className && assignment.section) {
          await client.query(
            `INSERT INTO teacher_subjects (teacher_id, subject, class_name, section)
             VALUES ($1, $2, $3, $4)`,
            [id, assignment.subject, assignment.className, assignment.section],
          );
        }
      }
    }
    // Save profile picture if uploaded
    if (req.file) {
      const photoUrl = `/uploads/teachers/${req.file.filename}`;
      await client.query(
        "UPDATE teachers SET profile_picture = $1 WHERE id = $2",
        [photoUrl, id],
      );
    }

    await client.query("COMMIT");

    // Get updated teacher
    const finalResult = await client.query(
      `SELECT t.*, u.name, u.email 
       FROM teachers t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.id = $1`,
      [id],
    );

    res.json(finalResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateTeacher:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// DELETE /api/admin/teachers/:id
const deleteTeacher = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get user_id first
    const teacherResult = await client.query(
      "SELECT user_id FROM teachers WHERE id = $1",
      [id],
    );

    if (teacherResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Teacher not found" });
    }

    const userId = teacherResult.rows[0].user_id;

    // Remove class teacher assignment
    await client.query(
      "UPDATE classes SET teacher_id = NULL WHERE teacher_id = $1",
      [id],
    );

    // Delete subject assignments
    await client.query("DELETE FROM teacher_subjects WHERE teacher_id = $1", [
      id,
    ]);

    // Delete teacher record
    await client.query("DELETE FROM teachers WHERE id = $1", [id]);

    // Delete user record
    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteTeacher error:", err.message); // ← check your terminal for this
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// ── Teacher: GET /api/teacher/profile ────────────────────────────────────────

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name, u.email,
              (
                SELECT json_build_object(
                  'id', c.id,
                  'class_name', c.class_name,
                  'grade', c.grade,
                  'section', c.section
                )
                FROM classes c
                WHERE c.teacher_id = t.id
                LIMIT 1
              ) AS "classTeacherAssignment",
              (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'subject', ts.subject,
                    'className', ts.class_name,
                    'section', ts.section
                  )
                  ORDER BY ts.class_name, ts.section, ts.subject
                ), '[]'::json)
                FROM teacher_subjects ts
                WHERE ts.teacher_id = t.id
              ) AS "subjectAssignments"
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Profile not found" });

    const row = result.rows[0];

    res.json({
      ...row,
      profile_picture: getPublicUrl(row.profile_picture),
      aadhar_image_url: getPublicUrl(row.aadhar_image_url),
    });
  } catch (err) {
    console.error("getProfile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Teacher: GET /api/teacher/classes ────────────────────────────────────────

const getTeacherAssignedClasses = async (teacherId) =>
  pool.query(
    `SELECT DISTINCT c.*
     FROM classes c
     WHERE c.teacher_id=$1 OR EXISTS (
       SELECT 1 FROM teacher_subjects ts
       WHERE ts.teacher_id=$1
         AND (ts.class_name=c.class_name OR ts.class_name=c.grade)
         AND (ts.section IS NULL OR ts.section='' OR ts.section=c.section)
     )
     ORDER BY c.grade,c.class_name,c.section`,
    [teacherId],
  );

const getClasses = async (req, res) => {
  try {
    const teacher = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [req.user.id],
    );
    if (teacher.rows.length === 0)
      return res.status(404).json({ message: "Teacher not found" });
    const result = await getTeacherAssignedClasses(teacher.rows[0].id);
    res.json(result.rows);
  } catch (err) {
    console.error("getClasses:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Teacher: GET /api/teacher/students ───────────────────────────────────────

const getStudents = async (req, res) => {
  try {
    const teacher = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [req.user.id],
    );
    if (teacher.rows.length === 0)
      return res.status(404).json({ message: "Teacher not found" });
    const classes = await getTeacherAssignedClasses(teacher.rows[0].id);
    if (classes.rows.length === 0) return res.json([]);
    const conditions = classes.rows
      .map(
        (_, i) =>
          `(s.class_id = $${i * 3 + 1} OR ((s.class = $${i * 3 + 2} OR s.class = CONCAT('Class ', $${i * 3 + 2})) AND s.section = $${i * 3 + 3}))`,
      )
      .join(" OR ");
    const values = classes.rows.flatMap((c) => [
      c.id,
      c.grade || c.class_name,
      c.section,
    ]);
    const result = await pool.query(
      `SELECT s.*, u.name, u.email
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE ${conditions} ORDER BY s.class, s.roll_number`,
      values,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getStudents:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Teacher: POST /api/teacher/attendance ────────────────────────────────────

const markAttendance = async (req, res) => {
  const { attendance } = req.body;
  if (!Array.isArray(attendance) || attendance.length === 0)
    return res.status(400).json({ message: "attendance array required" });
  try {
    const placeholders = attendance
      .map(
        (_, i) =>
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`,
      )
      .join(", ");
    const values = attendance.flatMap((a) => [
      a.student_id,
      a.date,
      a.status,
      req.user.id,
    ]);
    await pool.query(
      `INSERT INTO attendance (student_id, date, status, marked_by)
       VALUES ${placeholders}
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
      values,
    );
    res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    console.error("markAttendance:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Teacher: POST /api/teacher/assignments ───────────────────────────────────

const createAssignment = async (req, res) => {
  const { class_id, title, description, due_date } = req.body;
  if (!class_id || !title)
    return res.status(400).json({ message: "class_id and title are required" });
  try {
    const teacher = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [req.user.id],
    );
    if (teacher.rows.length === 0)
      return res.status(404).json({ message: "Teacher not found" });
    const result = await pool.query(
      `INSERT INTO assignments (teacher_id, class_id, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [teacher.rows[0].id, class_id, title, description, due_date],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createAssignment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Teacher: POST /api/teacher/results ───────────────────────────────────────

const addResult = async (req, res) => {
  const {
    student_id,
    subject,
    marks_obtained,
    total_marks,
    exam_type,
    exam_date,
  } = req.body;
  if (!student_id || !subject || marks_obtained == null || !total_marks)
    return res
      .status(400)
      .json({
        message: "student_id, subject, marks_obtained, total_marks required",
      });
  try {
    const result = await pool.query(
      `INSERT INTO results (student_id, subject, marks_obtained, total_marks, exam_type, exam_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student_id, subject, marks_obtained, total_marks, exam_type, exam_date],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("addResult:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Admin: PUT /api/admin/teachers/:id ───────────────────────────────────────

// Add this helper function to check if teacher is already a class teacher
const checkTeacherAlreadyClassTeacher = async (
  client,
  teacherId,
  excludeClassId = null,
) => {
  const query = `
    SELECT c.id, c.grade, c.section
    FROM classes c
    WHERE c.teacher_id = $1
    ${excludeClassId ? "AND c.id != $2" : ""}
  `;

  const params = excludeClassId ? [teacherId, excludeClassId] : [teacherId];
  const result = await client.query(query, params);
  return result.rows[0] || null;
};

const getTimetable = async (req, res) => {
  try {
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [req.user.id],
    );
    if (!teacherResult.rows.length) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const teacherId = teacherResult.rows[0].id;

    const result = await pool.query(
      `SELECT
         tt.id,
         tt.day_of_week  AS day,
         tt.start_time,
         tt.end_time,
         tt.subject,
         c.grade         AS class_name,
         c.section
       FROM timetable tt
       LEFT JOIN classes c ON c.id = tt.class_id
       WHERE tt.teacher_id = $1
       ORDER BY
         CASE tt.day_of_week
           WHEN 'Monday'    THEN 1
           WHEN 'Tuesday'   THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday'  THEN 4
           WHEN 'Friday'    THEN 5
           WHEN 'Saturday'  THEN 6
           ELSE 7
         END,
         tt.start_time`,
      [teacherId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getTimetable:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── Teacher: PUT /api/teacher/fees/:studentId ─────────────────────────────────
// Allows a class teacher to update a student's fee status
const updateStudentFee = async (req, res) => {
  const { studentId } = req.params;
  const { fee_status } = req.body;

  const VALID = ["Paid", "Pending", "Overdue"];
  if (!VALID.includes(fee_status)) {
    return res
      .status(400)
      .json({ message: "fee_status must be Paid, Pending, or Overdue" });
  }

  try {
    // Verify the teacher is actually the class teacher for this student's class
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [req.user.id],
    );
    if (!teacherResult.rows.length) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const teacherId = teacherResult.rows[0].id;

    // Check teacher has this student in one of their classes
    const studentCheck = await pool.query(
      `SELECT s.id
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = $1 AND c.teacher_id = $2
       LIMIT 1`,
      [studentId, teacherId],
    );

    if (!studentCheck.rows.length) {
      return res
        .status(403)
        .json({
          message: "You do not have permission to update this student's fee.",
        });
    }

    const result = await pool.query(
      "UPDATE students SET fee_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [fee_status, studentId],
    );

    res.json({ message: "Fee status updated", student: result.rows[0] });
  } catch (err) {
    console.error("updateStudentFee:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// GET /api/teacher/homework-classes
// Works for BOTH class teachers AND subject teachers
const getHomeworkClasses = async (req, res) => {
  try {
    const teacher = await pool.query(
      "SELECT id, teacher_type FROM teachers WHERE user_id = $1",
      [req.user.id],
    );
    if (teacher.rows.length === 0)
      return res.status(404).json({ message: "Teacher not found" });

    const { id: teacherId, teacher_type } = teacher.rows[0];
    const result = [];

    // ── Class Teacher: classes table se ──
    if (teacher_type === "Class Teacher" || teacher_type === "Both") {
      const classes = await pool.query(
        "SELECT id, grade, section, class_name FROM classes WHERE teacher_id = $1",
        [teacherId],
      );
      classes.rows.forEach((c) => {
        result.push({
          class_id: c.id,
          grade: c.grade || c.class_name,
          section: c.section,
          source: "class_teacher",
        });
      });
    }

    // ── Subject Teacher: teacher_subjects table se ──
    if (teacher_type === "Subject Teacher" || teacher_type === "Both") {
      const subjRows = await pool.query(
        "SELECT subject, class_name, section FROM teacher_subjects WHERE teacher_id = $1",
        [teacherId],
      );

      for (const a of subjRows.rows) {
        if (!a.class_name || !a.section) continue;

        // classes table mein matching class dhundo
        const cls = await pool.query(
          `SELECT id, grade, section 
           FROM classes 
           WHERE (grade = $1 OR class_name = $1 OR class_name = $2) 
             AND section = $3 
           LIMIT 1`,
          [a.class_name, `Class ${a.class_name}`, a.section],
        );

        if (cls.rows.length > 0) {
          const exists = result.find((r) => r.class_id === cls.rows[0].id);
          if (!exists) {
            result.push({
              class_id: cls.rows[0].id,
              grade: cls.rows[0].grade || a.class_name,
              section: cls.rows[0].section,
              source: "subject_teacher",
              subject: a.subject,
            });
          }
        } else {
          // Class table mein entry nahi — directly show karo
          const exists = result.find(
            (r) =>
              String(r.grade) === String(a.class_name) &&
              r.section === a.section,
          );
          if (!exists) {
            result.push({
              class_id: null,
              grade: a.class_name,
              section: a.section,
              source: "subject_teacher_no_class",
              subject: a.subject,
            });
          }
        }
      }
    }

    return res.json(result);
  } catch (err) {
    console.error("getHomeworkClasses:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/admin/teachers/:id/aadhar-image ─────────────────────────────
const uploadTeacherAadharImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = `/uploads/aadhar-teachers/${req.file.filename}`;
    await pool.query(
      "UPDATE teachers SET aadhar_image_url = $1 WHERE id = $2",
      [imageUrl, req.params.id],
    );
    res.json({
      message: "Aadhaar image uploaded successfully",
      aadhar_image_url: imageUrl,
    });
  } catch (err) {
    console.error("uploadTeacherAadharImage error:", err);
    res.status(500).json({ message: "Failed to upload Aadhaar image" });
  }
};

// ── PUT /api/admin/teachers/:id/aadhar-number ─────────────────────────────
const updateTeacherAadharNumber = async (req, res) => {
  try {
    const { aadhar_number } = req.body;
    if (!aadhar_number || !/^\d{12}$/.test(aadhar_number)) {
      return res
        .status(400)
        .json({ message: "Valid 12-digit Aadhaar number required" });
    }
    await pool.query("UPDATE teachers SET aadhar_number = $1 WHERE id = $2", [
      aadhar_number,
      req.params.id,
    ]);
    res.json({ message: "Aadhaar number updated successfully" });
  } catch (err) {
    console.error("updateTeacherAadharNumber error:", err);
    res.status(500).json({ message: "Failed to update Aadhaar number" });
  }
};

module.exports = {
  getAllTeachers,
  getTeacherMeta,
  createTeacher,
  deleteTeacher,
  getProfile,
  getClasses,
  getStudents,
  markAttendance,
  createAssignment,
  addResult,
  updateTeacher,
  checkTeacherAlreadyClassTeacher,
  getTimetable,
  updateStudentFee,
  getHomeworkClasses,
  uploadTeacherAadharImage,
  updateTeacherAadharNumber,
};
