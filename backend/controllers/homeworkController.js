// controllers/homeworkController.js — PostgreSQL version
const db = require("../config/db");

const uid = (req) => req.user.id || req.user.userId;

// ── POST /api/homework ────────────────────────────────────────────────────────
// const createHomework = async (req, res) => {
//   try {
//     const teacher_id = uid(req);
//     const { title, description, subject, class_id, section, due_date } = req.body;

//     if (!title || !subject || !class_id || !section || !due_date) {
//       return res.status(400).json({ message: "All fields are required." });
//     }

//     const result = await db.query(
//       `INSERT INTO homework (title, description, subject, class_id, section, teacher_id, due_date)
//        VALUES ($1, $2, $3, $4, $5, $6, $7)
//        RETURNING id`,
//       [title, description || "", subject, class_id, section, teacher_id, due_date]
//     );

//     return res.status(201).json({
//       message: "Homework assigned successfully.",
//       homework_id: result.rows[0].id,
//     });
//   } catch (err) {
//     console.error("createHomework:", err);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };
const createHomework = async (req, res) => {
  try {
    const teacher_id = uid(req);
    const { title, description, subject, class_id, section, due_date } = req.body;

    if (!title || !subject || !section || !due_date) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (due_date < today) {
      return res
        .status(400)
        .json({ message: "Homework due date cannot be in the past." });
    }

    // class_id null ho sakta hai subject teachers ke liye
    // In that case, class_id column NULL allow karna hoga ya skip karo
    const result = await db.query(
      `INSERT INTO homework 
        (title, description, subject, class_id, section, teacher_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [title, description || "", subject, class_id || null, section, teacher_id, due_date]
    );

    return res.status(201).json({
      message: "Homework assigned successfully.",
      homework_id: result.rows[0].id,
    });
  } catch (err) {
    console.error("createHomework:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ── GET /api/homework/teacher ─────────────────────────────────────────────────
const getHomeworkByTeacher = async (req, res) => {
  try {
    const teacher_id = uid(req);

    const result = await db.query(
      `SELECT h.*
       FROM   homework h
       WHERE  h.teacher_id = $1
       ORDER BY h.due_date DESC`,
      [teacher_id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("getHomeworkByTeacher:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ── GET /api/homework/student ─────────────────────────────────────────────────
const getHomeworkForStudent = async (req, res) => {
  try {
    const token_id = uid(req);

    // Your students table has both:
    //   user_id → links to the users table (16, 21, 23...)
    //   id      → the student's own PK (3, 4, 5...)
    // JWT may contain either one, so we try both in one query.
    const studentRes = await db.query(
      `SELECT class_id, section
       FROM   students
       WHERE  user_id = $1
          OR  id      = $1
       LIMIT 1`,
      [token_id]
    );

    if (!studentRes.rows.length) {
      console.error(`[homework] no student for token id=${token_id}`);
      return res.status(404).json({ message: "Student not found.", debug_uid: token_id });
    }

    const { class_id, section } = studentRes.rows[0];

    const result = await db.query(
      `SELECT h.*, u.name AS teacher_name
       FROM   homework h
       LEFT JOIN teachers t ON t.id = h.teacher_id
       LEFT JOIN users    u ON u.id = t.user_id
       WHERE  h.class_id = $1
         AND  h.section  = $2
       ORDER BY h.due_date ASC`,
      [class_id, section]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("getHomeworkForStudent:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ── DELETE /api/homework/:id ──────────────────────────────────────────────────
const deleteHomework = async (req, res) => {
  try {
    const teacher_id  = uid(req);
    const homework_id = req.params.id;

    const result = await db.query(
      `DELETE FROM homework WHERE id = $1 AND teacher_id = $2`,
      [homework_id, teacher_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Homework not found or unauthorized." });
    }

    return res.json({ message: "Homework deleted." });
  } catch (err) {
    console.error("deleteHomework:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { createHomework, getHomeworkByTeacher, getHomeworkForStudent, deleteHomework };
