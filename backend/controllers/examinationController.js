const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("../config/db");
const { getExamClearance } = require("../services/feeClearanceService");

const isValidDateString = (value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2100) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const dateOnly = (value) =>
  value?.toISOString?.().slice(0, 10) || String(value || "").slice(0, 10);

const getExaminationAdmin = async (_req, res) => {
  try {
    const [exams, schedule, papers, cards] = await Promise.all([
      pool.query("SELECT * FROM exams ORDER BY created_at DESC"),
      pool.query(
        `SELECT es.*,e.name AS exam_name,e.class,e.section,e.academic_year
         FROM exam_schedule es JOIN exams e ON e.id=es.exam_id
         ORDER BY es.exam_date,es.start_time`,
      ),
      pool.query(
        `SELECT qp.*,e.name AS exam_name,e.class,e.section
         FROM question_papers qp JOIN exams e ON e.id=qp.exam_id
         ORDER BY qp.created_at DESC`,
      ),
      pool.query(
        `SELECT ac.exam_id,e.name AS exam_name,e.class,e.section,
                COUNT(ac.id)::int AS card_count,
                COUNT(ac.id) FILTER(WHERE ac.published)::int AS published_count
         FROM admit_cards ac JOIN exams e ON e.id=ac.exam_id
         GROUP BY ac.exam_id,e.id ORDER BY e.created_at DESC`,
      ),
    ]);
    res.json({
      exams: exams.rows,
      schedule: schedule.rows,
      question_papers: papers.rows,
      admit_card_batches: cards.rows,
    });
  } catch (error) {
    console.error("getExaminationAdmin:", error);
    res.status(500).json({ message: "Failed to load examination management" });
  }
};

const saveSchedule = async (req, res) => {
  const {
    exam_id,
    subject,
    exam_date,
    start_time,
    end_time,
    room,
    instructions,
    published = false,
  } = req.body;
  if (!exam_id || !subject?.trim() || !exam_date || !start_time || !end_time) {
    return res.status(400).json({
      message: "Exam, subject, date, start time, and end time are required",
    });
  }
  if (!isValidDateString(exam_date)) {
    return res
      .status(400)
      .json({ message: "Exam date must be a valid YYYY-MM-DD date" });
  }
  if (start_time >= end_time) {
    return res
      .status(400)
      .json({ message: "End time must be after start time" });
  }
  try {
    const exam = await pool.query(
      "SELECT id,start_date,end_date,status FROM exams WHERE id=$1",
      [exam_id],
    );
    if (!exam.rows.length) {
      return res.status(404).json({ message: "Exam not found" });
    }
    const { start_date: examStart, end_date: examEnd } = exam.rows[0];
    const start = dateOnly(examStart);
    const end = dateOnly(examEnd);
    if (!start || !end) {
      return res.status(409).json({
        message: "Set the exam start and end dates before creating its date sheet",
      });
    }
    if (exam_date < start || exam_date > end) {
      return res.status(400).json({
        message: `Exam date must be between ${start} and ${end}`,
      });
    }
    if (["submitted", "approved", "result_published"].includes(exam.rows[0].status)) {
      return res.status(409).json({
        message: "Date sheet cannot be changed after the class result is submitted",
      });
    }
    if (req.params.id) {
      const releasedCards = await pool.query(
        `SELECT COUNT(*)::int AS count
           FROM admit_cards ac
           JOIN exam_schedule es ON es.exam_id=ac.exam_id
          WHERE es.id=$1 AND ac.published=TRUE`,
        [req.params.id],
      );
      if (releasedCards.rows[0].count) {
        return res.status(409).json({
          message:
            "This date sheet is locked because admit cards are already published. Unpublish the admit cards first.",
        });
      }
    }
    const values = [
      exam_id,
      subject.trim(),
      exam_date,
      start_time,
      end_time,
      room || null,
      instructions || null,
      Boolean(published),
    ];
    const result = req.params.id
      ? await pool.query(
          `UPDATE exam_schedule SET exam_id=$1,subject=$2,exam_date=$3,
             start_time=$4,end_time=$5,room=$6,instructions=$7,published=$8,
             updated_at=NOW() WHERE id=$9 RETURNING *`,
          [...values, req.params.id],
        )
      : await pool.query(
          `INSERT INTO exam_schedule
             (exam_id,subject,exam_date,start_time,end_time,room,instructions,published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          values,
        );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }
    res.status(req.params.id ? 200 : 201).json(result.rows[0]);
  } catch (error) {
    console.error("saveSchedule:", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Subject is already scheduled on this date" });
    }
    res.status(500).json({ message: "Failed to save examination schedule" });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const releasedCards = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM admit_cards ac
         JOIN exam_schedule es ON es.exam_id=ac.exam_id
        WHERE es.id=$1 AND ac.published=TRUE`,
      [req.params.id],
    );
    if (releasedCards.rows[0].count) {
      return res.status(409).json({
        message:
          "This date sheet is locked because admit cards are already published. Unpublish the admit cards first.",
      });
    }
    const result = await pool.query(
      "DELETE FROM exam_schedule WHERE id=$1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }
    res.json({ message: "Schedule entry deleted" });
  } catch (error) {
    console.error("deleteSchedule:", error);
    res.status(500).json({ message: "Failed to delete schedule entry" });
  }
};

const uploadQuestionPaper = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Question paper file is required" });
  const { exam_id, subject, title, access_status, release_at } = req.body;
  if (!exam_id || !subject?.trim() || !title?.trim()) {
    fs.unlink(req.file.path, () => {});
    return res
      .status(400)
      .json({ message: "Exam, subject, and title are required" });
  }
  try {
    const exam = await pool.query(
      "SELECT start_date,end_date FROM exams WHERE id=$1",
      [exam_id],
    );
    if (!exam.rows.length) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Exam not found" });
    }
    if (release_at) {
      const releaseDate = String(release_at).slice(0, 10);
      const start = dateOnly(exam.rows[0].start_date);
      const end = dateOnly(exam.rows[0].end_date);
      if ((start && releaseDate < start) || (end && releaseDate > end)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message: `Question-paper release must be between ${start} and ${end}`,
        });
      }
    }
    const result = await pool.query(
      `INSERT INTO question_papers
         (exam_id,subject,title,file_name,file_url,mime_type,access_status,
          release_at,uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        exam_id,
        subject.trim(),
        title.trim(),
        req.file.originalname,
        `/uploads/question-papers/${req.file.filename}`,
        req.file.mimetype,
        access_status || "Restricted",
        release_at || null,
        req.user.id,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    console.error("uploadQuestionPaper:", error);
    res.status(500).json({ message: "Failed to upload question paper" });
  }
};

const updateQuestionPaper = async (req, res) => {
  try {
    if (req.body.release_at) {
      const paper = await pool.query(
        `SELECT e.start_date,e.end_date
           FROM question_papers qp JOIN exams e ON e.id=qp.exam_id
          WHERE qp.id=$1`,
        [req.params.id],
      );
      if (!paper.rows.length) {
        return res.status(404).json({ message: "Question paper not found" });
      }
      const releaseDate = String(req.body.release_at).slice(0, 10);
      const start = dateOnly(paper.rows[0].start_date);
      const end = dateOnly(paper.rows[0].end_date);
      if ((start && releaseDate < start) || (end && releaseDate > end)) {
        return res.status(400).json({
          message: `Question-paper release must be between ${start} and ${end}`,
        });
      }
    }
    const result = await pool.query(
      `UPDATE question_papers SET access_status=COALESCE($1,access_status),
         release_at=$2,title=COALESCE($3,title)
       WHERE id=$4 RETURNING *`,
      [
        req.body.access_status || null,
        req.body.release_at || null,
        req.body.title || null,
        req.params.id,
      ],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Question paper not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateQuestionPaper:", error);
    res.status(500).json({ message: "Failed to update question paper" });
  }
};

const deleteQuestionPaper = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM question_papers WHERE id=$1 RETURNING file_url",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Question paper not found" });
    }
    const filePath = path.resolve(
      __dirname,
      "..",
      result.rows[0].file_url.replace(/^\/+/, ""),
    );
    const uploadRoot = path.resolve(__dirname, "../uploads/question-papers");
    if (filePath.startsWith(uploadRoot)) fs.unlink(filePath, () => {});
    res.json({ message: "Question paper deleted" });
  } catch (error) {
    console.error("deleteQuestionPaper:", error);
    res.status(500).json({ message: "Failed to delete question paper" });
  }
};

const generateAdmitCards = async (req, res) => {
  const examId = req.params.examId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const exam = await client.query("SELECT * FROM exams WHERE id=$1", [
      examId,
    ]);
    if (!exam.rows.length) throw new Error("Exam not found");
    const schedule = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE published=TRUE)::int AS published
         FROM exam_schedule WHERE exam_id=$1`,
      [examId],
    );
    if (!schedule.rows[0].total) {
      throw new Error(
        "Create and publish the complete date sheet before generating admit cards",
      );
    }
    if (schedule.rows[0].published !== schedule.rows[0].total) {
      throw new Error(
        "Publish every date-sheet entry before generating admit cards",
      );
    }
    const params = [exam.rows[0].class];
    let sectionFilter = "";
    if (exam.rows[0].section) {
      params.push(exam.rows[0].section);
      sectionFilter = ` AND LOWER(TRIM(s.section))=LOWER(TRIM($${params.length}))`;
    }
    const students = await client.query(
      `SELECT s.id
       FROM students s
       LEFT JOIN classes c ON c.id=s.class_id
       WHERE (
         LOWER(TRIM(s.class))=LOWER(TRIM($1))
         OR LOWER(TRIM(c.grade))=LOWER(TRIM($1))
         OR LOWER(TRIM(c.class_name))=LOWER(TRIM($1))
         OR LOWER(TRIM(c.class_name))=LOWER(TRIM(CONCAT('Class ', $1)))
       )
       ${sectionFilter}
         AND COALESCE(s.is_active,TRUE)=TRUE`,
      params,
    );
    let generated = 0;
    for (const student of students.rows) {
      const cardNumber = `AC-${examId}-${student.id}-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;
      const result = await client.query(
        `INSERT INTO admit_cards(exam_id,student_id,card_number,generated_by)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT(exam_id,student_id) DO NOTHING RETURNING id`,
        [examId, student.id, cardNumber, req.user.id],
      );
      generated += result.rowCount;
    }
    await client.query("COMMIT");
    res.json({
      message: `${generated} new admit cards generated`,
      generated,
      total_students: students.rows.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("generateAdmitCards:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to generate admit cards" });
  } finally {
    client.release();
  }
};

const publishAdmitCards = async (req, res) => {
  try {
    const shouldPublish = req.body.published !== false;
    if (!shouldPublish) {
      const result = await pool.query(
        "UPDATE admit_cards SET published=FALSE WHERE exam_id=$1 RETURNING id",
        [req.params.examId],
      );
      return res.json({
        updated: result.rowCount,
        message: "Admit cards unpublished. The date sheet can now be updated.",
      });
    }
    const schedule = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE published=TRUE)::int AS published
         FROM exam_schedule WHERE exam_id=$1`,
      [req.params.examId],
    );
    if (
      !schedule.rows[0].total ||
      schedule.rows[0].published !== schedule.rows[0].total
    ) {
      return res.status(409).json({
        message: "Publish the complete date sheet before releasing admit cards",
      });
    }
    const clearance = await getExamClearance(req.params.examId);
    if (!clearance) {
      return res.status(404).json({ message: "Exam not found" });
    }
    const eligibleIds = clearance.rows
      .filter((row) => row.result_eligible)
      .map((row) => row.student_id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE admit_cards SET published=FALSE WHERE exam_id=$1",
        [req.params.examId],
      );
      const result = eligibleIds.length
        ? await client.query(
            `UPDATE admit_cards SET published=TRUE
              WHERE exam_id=$1 AND student_id=ANY($2::int[]) RETURNING id`,
            [req.params.examId, eligibleIds],
          )
        : { rowCount: 0 };
      await client.query("COMMIT");
      res.json({
        updated: result.rowCount,
        blocked: clearance.summary.blocked,
        message: `${result.rowCount} admit card(s) released${
          clearance.summary.blocked
            ? `; ${clearance.summary.blocked} held for fee clearance`
            : ""
        }`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("publishAdmitCards:", error);
    res.status(500).json({ message: "Failed to publish admit cards" });
  }
};

const getTeacherAdmitCards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ac.*,e.name AS exam_name,e.exam_type,e.academic_year,e.class,e.section,
              e.start_date,e.end_date,u.name AS student_name,s.roll_number,
              s.photo_url,es.schedule
         FROM teachers t
         JOIN exams e ON TRUE
         LEFT JOIN classes c ON c.id=e.class_id
         JOIN admit_cards ac ON ac.exam_id=e.id
         JOIN students s ON s.id=ac.student_id
         JOIN users u ON u.id=s.user_id
         LEFT JOIN LATERAL (
           SELECT JSON_AGG(JSON_BUILD_OBJECT(
             'subject',subject,'exam_date',exam_date,'start_time',start_time,
             'end_time',end_time,'room',room,'instructions',instructions
           ) ORDER BY exam_date,start_time) AS schedule
             FROM exam_schedule WHERE exam_id=e.id AND published=TRUE
         ) es ON TRUE
        WHERE t.user_id=$1
          AND COALESCE(c.teacher_id,e.class_teacher_id)=t.id
        ORDER BY e.start_date DESC,u.name`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getTeacherAdmitCards:", error);
    res.status(500).json({ message: "Failed to load class admit cards" });
  }
};

const getAdmitCards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ac.*,e.name AS exam_name,e.exam_type,e.academic_year,e.class,e.section,
              e.start_date,e.end_date,u.name AS student_name,s.roll_number,
              s.photo_url,es.schedule
       FROM admit_cards ac
       JOIN exams e ON e.id=ac.exam_id
       JOIN students s ON s.id=ac.student_id
       JOIN users u ON u.id=s.user_id
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
           'subject',subject,'exam_date',exam_date,'start_time',start_time,
           'end_time',end_time,'room',room
         ) ORDER BY exam_date,start_time) AS schedule
         FROM exam_schedule WHERE exam_id=e.id
       ) es ON TRUE
       WHERE ac.exam_id=$1 ORDER BY u.name`,
      [req.params.examId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getAdmitCards:", error);
    res.status(500).json({ message: "Failed to load admit cards" });
  }
};

const getStudentExaminations = async (req, res) => {
  try {
    const studentResult = await pool.query(
      `SELECT s.*,u.name,c.grade,c.class_name
       FROM students s
       JOIN users u ON u.id=s.user_id
       LEFT JOIN classes c ON c.id=s.class_id
       WHERE s.user_id=$1`,
      [req.user.id],
    );
    if (!studentResult.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }
    const student = studentResult.rows[0];
    const classMatchSql = `(
      LOWER(TRIM(e.class))=LOWER(TRIM($1))
      OR LOWER(TRIM(e.class))=LOWER(TRIM($3))
      OR LOWER(TRIM(e.class))=LOWER(TRIM($4))
      OR LOWER(TRIM(e.class))=LOWER(TRIM(CONCAT('Class ', $1)))
    )`;
    const examParams = [
      student.class || "",
      student.section || "",
      student.grade || "",
      student.class_name || "",
    ];

    const [schedule, papers, cards] = await Promise.all([
      pool.query(
        `SELECT es.*,e.name AS exam_name,e.academic_year
         FROM exam_schedule es
         JOIN exams e ON e.id=es.exam_id
         LEFT JOIN classes c ON c.id=$5
         WHERE ${classMatchSql}
           AND (e.section IS NULL OR LOWER(TRIM(e.section))=LOWER(TRIM($2)))
           AND es.published=TRUE
         ORDER BY es.exam_date,es.start_time`,
        [...examParams, student.class_id || null],
      ),
      pool.query(
        `SELECT qp.id,qp.exam_id,qp.subject,qp.title,qp.file_url,qp.release_at,
                e.name AS exam_name
         FROM question_papers qp JOIN exams e ON e.id=qp.exam_id
         WHERE ${classMatchSql}
           AND (e.section IS NULL OR LOWER(TRIM(e.section))=LOWER(TRIM($2)))
           AND qp.access_status='Published'
           AND (qp.release_at IS NULL OR qp.release_at<=NOW())
         ORDER BY qp.created_at DESC`,
        examParams,
      ),
      pool.query(
        `SELECT ac.*,e.name AS exam_name,e.exam_type,e.academic_year,
                e.start_date,e.end_date
         FROM admit_cards ac JOIN exams e ON e.id=ac.exam_id
         WHERE ac.student_id=$1 AND ac.published=TRUE
         ORDER BY e.start_date DESC`,
        [student.id],
      ),
    ]);
    res.json({
      student,
      schedule: schedule.rows,
      question_papers: papers.rows,
      admit_cards: cards.rows,
    });
  } catch (error) {
    console.error("getStudentExaminations:", error);
    res.status(500).json({ message: "Failed to load examinations" });
  }
};

module.exports = {
  getExaminationAdmin,
  saveSchedule,
  deleteSchedule,
  uploadQuestionPaper,
  updateQuestionPaper,
  deleteQuestionPaper,
  generateAdmitCards,
  publishAdmitCards,
  getAdmitCards,
  getTeacherAdmitCards,
  getStudentExaminations,
};
