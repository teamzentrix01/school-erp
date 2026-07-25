const fs = require("fs");
const pool = require("../config/db");
const { getExamClearance } = require("../services/feeClearanceService");

const gradeFor = (marks, total) => {
  const percentage =
    Number(total) > 0 ? (Number(marks) / Number(total)) * 100 : 0;
  if (percentage >= 90) return "A+";
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 45) return "C";
  if (percentage >= 33) return "D";
  return "F";
};

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

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const getTeacherAssignment = async (userId, examId, subject, section) => {
  const result = await pool.query(
    `SELECT t.id AS teacher_id, e.*, $3::varchar AS assigned_subject,
            COALESCE(e.section, c.section, $4::varchar) AS assigned_section
     FROM teachers t
     JOIN exams e ON TRUE
     LEFT JOIN classes c ON c.id = e.class_id
     WHERE t.user_id = $1
       AND COALESCE(c.teacher_id, e.class_teacher_id) = t.id
       AND e.id = $2
       AND LOWER(TRIM(COALESCE(e.section, c.section))) = LOWER(TRIM($4))
       AND EXISTS (
         SELECT 1
         FROM (
           SELECT es.subject FROM exam_schedule es WHERE es.exam_id = e.id
           UNION
           SELECT ts.subject
             FROM teacher_subjects ts
            WHERE LOWER(TRIM(ts.class_name)) = LOWER(TRIM(e.class))
              AND LOWER(TRIM(ts.section)) = LOWER(TRIM(COALESCE(e.section, c.section)))
           UNION
           SELECT tt.subject
             FROM timetable tt
            WHERE tt.class_id = e.class_id
           UNION
           SELECT r.subject FROM results r WHERE r.exam_id = e.id
         ) configured_subjects
         WHERE LOWER(TRIM(configured_subjects.subject)) = LOWER(TRIM($3))
       )
     LIMIT 1`,
    [userId, examId, subject, section],
  );
  return result.rows[0] || null;
};

const getTeacherExams = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT e.*, subjects.subject,
              COALESCE(e.section, c.section) AS assigned_section,
              rs.id AS submission_id,
              COALESCE(rs.status, 'draft') AS submission_status,
              rs.feedback, rs.submitted_at, rs.reviewed_at
       FROM teachers t
       JOIN exams e ON TRUE
       LEFT JOIN classes c ON c.id = e.class_id
       JOIN LATERAL (
         SELECT DISTINCT configured.subject
         FROM (
           SELECT es.subject FROM exam_schedule es WHERE es.exam_id = e.id
           UNION
           SELECT ts.subject
             FROM teacher_subjects ts
            WHERE LOWER(TRIM(ts.class_name)) = LOWER(TRIM(e.class))
              AND LOWER(TRIM(ts.section)) = LOWER(TRIM(COALESCE(e.section, c.section)))
           UNION
           SELECT tt.subject
             FROM timetable tt
            WHERE tt.class_id = e.class_id
           UNION
           SELECT r.subject FROM results r WHERE r.exam_id = e.id
         ) configured
       ) subjects ON TRUE
       LEFT JOIN result_submissions rs
         ON rs.exam_id = e.id
        AND rs.teacher_id = t.id
        AND LOWER(TRIM(rs.subject)) = LOWER(TRIM(subjects.subject))
        AND LOWER(TRIM(rs.section)) = LOWER(TRIM(COALESCE(e.section, c.section)))
       WHERE t.user_id = $1
         AND COALESCE(c.teacher_id, e.class_teacher_id) = t.id
         AND e.status IN ('released','marks_in_progress','submitted','returned','approved')
       ORDER BY e.created_at DESC, subjects.subject, assigned_section`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getTeacherExams:", error);
    res.status(500).json({ message: "Failed to load assigned exams" });
  }
};

const getTeacherExamMarks = async (req, res) => {
  const { subject, section } = req.query;
  if (!subject || !section) {
    return res
      .status(400)
      .json({ message: "Subject and section are required" });
  }
  try {
    const assignment = await getTeacherAssignment(
      req.user.id,
      req.params.id,
      subject,
      section,
    );
    if (!assignment) {
      return res
        .status(403)
        .json({ message: "This exam is not assigned to you" });
    }
    const result = await pool.query(
      `SELECT s.id AS student_id, s.roll_number, u.name AS student_name,
              r.marks_obtained, r.total_marks, r.remarks, r.grade,
              COALESCE(r.attendance_status, 'Present') AS attendance_status
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN results r
         ON r.student_id = s.id
        AND r.exam_id = $3
        AND LOWER(TRIM(r.subject)) = LOWER(TRIM($4))
       WHERE LOWER(TRIM(s.class)) = LOWER(TRIM($1))
         AND LOWER(TRIM(s.section)) = LOWER(TRIM($2))
         AND COALESCE(s.is_active, TRUE) = TRUE
       ORDER BY NULLIF(REGEXP_REPLACE(COALESCE(s.roll_number, ''), '\\D', '', 'g'), '')::int NULLS LAST,
                u.name`,
      [assignment.class, section, assignment.id, subject],
    );
    const submission = await pool.query(
      `SELECT * FROM result_submissions
       WHERE exam_id = $1 AND teacher_id = $2
         AND LOWER(TRIM(subject)) = LOWER(TRIM($3))
         AND LOWER(TRIM(section)) = LOWER(TRIM($4))
       LIMIT 1`,
      [assignment.id, assignment.teacher_id, subject, section],
    );
    res.json({
      exam: assignment,
      subject: assignment.assigned_subject,
      section: assignment.assigned_section,
      submission: submission.rows[0] || { status: "draft" },
      rows: result.rows,
    });
  } catch (error) {
    console.error("getTeacherExamMarks:", error);
    res.status(500).json({ message: "Failed to load marks entry" });
  }
};

const saveTeacherMarks = async (req, res) => {
  const { subject, section, marks } = req.body;
  if (!subject || !section || !Array.isArray(marks) || !marks.length) {
    return res
      .status(400)
      .json({ message: "Subject, section, and marks are required" });
  }
  const assignment = await getTeacherAssignment(
    req.user.id,
    req.params.id,
    subject,
    section,
  );
  if (!assignment) {
    return res
      .status(403)
      .json({ message: "This exam is not assigned to you" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT status FROM result_submissions
       WHERE exam_id=$1 AND teacher_id=$2
         AND LOWER(TRIM(subject))=LOWER(TRIM($3))
         AND LOWER(TRIM(section))=LOWER(TRIM($4))
       FOR UPDATE`,
      [assignment.id, assignment.teacher_id, subject, section],
    );
    if (["submitted", "approved"].includes(current.rows[0]?.status)) {
      throw new Error(
        "Submitted marks are locked. Ask admin to return them for editing.",
      );
    }

    const validStudents = await client.query(
      `SELECT id FROM students
       WHERE LOWER(TRIM(class))=LOWER(TRIM($1))
         AND LOWER(TRIM(section))=LOWER(TRIM($2))
         AND COALESCE(is_active, TRUE)=TRUE`,
      [assignment.class, section],
    );
    const allowedIds = new Set(validStudents.rows.map((row) => Number(row.id)));
    let saved = 0;
    for (const item of marks) {
      if (!allowedIds.has(Number(item.student_id))) {
        throw new Error("A student does not belong to the assigned class");
      }
      const attendance = ["Present", "Absent", "Medical"].includes(
        item.attendance_status,
      )
        ? item.attendance_status
        : "Present";
      if (
        attendance === "Present" &&
        (item.marks_obtained === "" || item.marks_obtained == null)
      ) {
        continue;
      }
      const total = Number(
        item.total_marks || assignment.default_total_marks || 100,
      );
      const obtained =
        attendance === "Present" ? Number(item.marks_obtained) : 0;
      if (
        !Number.isFinite(obtained) ||
        !Number.isFinite(total) ||
        total <= 0 ||
        obtained < 0 ||
        obtained > total
      ) {
        throw new Error("Marks must be between 0 and total marks");
      }
      const updated = await client.query(
        `UPDATE results SET marks_obtained=$1, total_marks=$2, remarks=$3,
           grade=$4, teacher_id=$5, attendance_status=$6, published=FALSE,
           exam_type=$7, exam_date=$8, updated_at=NOW()
         WHERE student_id=$9 AND exam_id=$10
           AND LOWER(TRIM(subject))=LOWER(TRIM($11))
         RETURNING id`,
        [
          obtained,
          total,
          item.remarks || null,
          gradeFor(obtained, total),
          assignment.teacher_id,
          attendance,
          assignment.exam_type,
          assignment.end_date || assignment.start_date || null,
          item.student_id,
          assignment.id,
          assignment.assigned_subject,
        ],
      );
      if (!updated.rows.length) {
        await client.query(
          `INSERT INTO results
             (student_id, subject, marks_obtained, total_marks, exam_type, exam_date,
              exam_id, remarks, grade, teacher_id, published, attendance_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11)`,
          [
            item.student_id,
            assignment.assigned_subject,
            obtained,
            total,
            assignment.exam_type,
            assignment.end_date || assignment.start_date || null,
            assignment.id,
            item.remarks || null,
            gradeFor(obtained, total),
            assignment.teacher_id,
            attendance,
          ],
        );
      }
      saved += 1;
    }
    await client.query(
      `INSERT INTO result_submissions
         (exam_id, teacher_id, subject, section, status, feedback)
       VALUES ($1,$2,$3,$4,'draft',NULL)
       ON CONFLICT (exam_id, teacher_id, subject, section)
       DO UPDATE SET status='draft', feedback=NULL, updated_at=NOW()`,
      [
        assignment.id,
        assignment.teacher_id,
        assignment.assigned_subject,
        assignment.assigned_section,
      ],
    );
    await client.query(
      `UPDATE exams SET status='marks_in_progress',updated_at=NOW()
        WHERE id=$1 AND status IN ('released','returned','marks_in_progress')`,
      [assignment.id],
    );
    await client.query("COMMIT");
    res.json({ message: `${saved} marks saved as draft`, saved });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("saveTeacherMarks:", error);
    res.status(400).json({ message: error.message || "Failed to save marks" });
  } finally {
    client.release();
  }
};

const submitTeacherMarks = async (req, res) => {
  const { subject, section } = req.body;
  const assignment = await getTeacherAssignment(
    req.user.id,
    req.params.id,
    subject,
    section,
  );
  if (!assignment) {
    return res
      .status(403)
      .json({ message: "This exam is not assigned to you" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const readiness = await client.query(
      `WITH expected_subjects AS (
         SELECT es.subject FROM exam_schedule es WHERE es.exam_id=$3
         UNION
         SELECT ts.subject FROM teacher_subjects ts
          WHERE LOWER(TRIM(ts.class_name))=LOWER(TRIM($1))
            AND LOWER(TRIM(ts.section))=LOWER(TRIM($2))
         UNION
         SELECT tt.subject FROM timetable tt WHERE tt.class_id=$4
         UNION
         SELECT r.subject FROM results r WHERE r.exam_id=$3
       ),
       active_students AS (
         SELECT id FROM students
          WHERE LOWER(TRIM(class))=LOWER(TRIM($1))
            AND LOWER(TRIM(section))=LOWER(TRIM($2))
            AND COALESCE(is_active,TRUE)=TRUE
       )
       SELECT es.subject,
              (SELECT COUNT(*) FROM active_students)::int AS students,
              COUNT(DISTINCT r.student_id)::int AS completed
         FROM expected_subjects es
         LEFT JOIN results r ON r.exam_id=$3
          AND LOWER(TRIM(r.subject))=LOWER(TRIM(es.subject))
          AND r.student_id IN (SELECT id FROM active_students)
        WHERE NULLIF(TRIM(es.subject),'') IS NOT NULL
        GROUP BY es.subject ORDER BY es.subject`,
      [
        assignment.class,
        section,
        assignment.id,
        assignment.class_id,
      ],
    );
    if (!readiness.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Configure the exam date sheet or class subjects before submission",
      });
    }
    const incomplete = readiness.rows.filter(
      (row) => !row.students || row.completed < row.students,
    );
    if (incomplete.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Complete every student for: ${incomplete
          .map((row) => `${row.subject} (${row.completed}/${row.students})`)
          .join(", ")}`,
      });
    }
    let submitted;
    for (const row of readiness.rows) {
      const result = await client.query(
        `INSERT INTO result_submissions
           (exam_id,teacher_id,subject,section,status,submitted_at,feedback)
         VALUES ($1,$2,$3,$4,'submitted',NOW(),NULL)
         ON CONFLICT (exam_id,teacher_id,subject,section)
         DO UPDATE SET status='submitted',submitted_at=NOW(),feedback=NULL,updated_at=NOW()
         RETURNING *`,
        [assignment.id, assignment.teacher_id, row.subject, section],
      );
      submitted ||= result.rows[0];
    }
    await client.query(
      "UPDATE exams SET status='submitted',updated_at=NOW() WHERE id=$1",
      [assignment.id],
    );
    await client.query("COMMIT");
    res.json({
      ...submitted,
      message: `Complete class result submitted for ${readiness.rows.length} subjects`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("submitTeacherMarks:", error);
    res.status(500).json({ message: "Failed to submit marks" });
  } finally {
    client.release();
  }
};

const getExams = async (req, res) => {
  try {
    const { academic_year, class: className, status } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    if (academic_year) {
      params.push(academic_year);
      where += ` AND e.academic_year = $${params.length}`;
    }
    if (className) {
      params.push(className);
      where += ` AND e.class = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND e.status = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT e.*, ec.name AS cycle_name, u.name AS class_teacher_name,
              COALESCE(assigned_class.teacher_id,e.class_teacher_id) AS effective_class_teacher_id,
              COUNT(r.id)::int AS marks_count,
              COUNT(DISTINCT r.student_id)::int AS students_marked
       FROM exams e
       LEFT JOIN exam_cycles ec ON ec.id=e.exam_cycle_id
       LEFT JOIN classes assigned_class ON assigned_class.id=e.class_id
       LEFT JOIN teachers t ON t.id=COALESCE(assigned_class.teacher_id,e.class_teacher_id)
       LEFT JOIN users u ON u.id=t.user_id
       LEFT JOIN results r ON r.exam_id = e.id
       ${where}
       GROUP BY e.id, ec.id, u.name, assigned_class.teacher_id
       ORDER BY e.created_at DESC`,
      params,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getExams:", error);
    res.status(500).json({ message: "Failed to load exams" });
  }
};

const createExam = async (req, res) => {
  const {
    name,
    exam_type,
    academic_year,
    class: className,
    section,
    start_date,
    end_date,
    default_total_marks = 100,
    fee_clearance_required = true,
    fee_clearance_mode = "full",
    fee_required_amount = 0,
    fee_clearance_cutoff_date,
    class_ids,
  } = req.body;
  const isBatch = Array.isArray(class_ids) && class_ids.length > 0;
  if (!name || !exam_type || !academic_year || (!className && !isBatch)) {
    return res
      .status(400)
      .json({ message: "Name, type, academic year, and class are required" });
  }
  if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
    return res.status(400).json({ message: "Exam dates must be valid YYYY-MM-DD dates" });
  }
  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ message: "Exam end date must be after start date" });
  }
  if (!["full", "amount"].includes(fee_clearance_mode)) {
    return res.status(400).json({ message: "Fee clearance mode must be full or amount" });
  }
  if (
    fee_clearance_required &&
    fee_clearance_mode === "amount" &&
    Number(fee_required_amount) <= 0
  ) {
    return res.status(400).json({ message: "Required fee amount must be greater than zero" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (isBatch) {
      const normalizedClassIds = class_ids.map(Number);
      if (normalizedClassIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new Error("Every selected class must have a valid numeric ID");
      }
      const uniqueClassIds = [...new Set(normalizedClassIds)];
      const classes = await client.query(
        `SELECT id, COALESCE(NULLIF(grade,''), class_name) AS grade, section, teacher_id
           FROM classes WHERE id = ANY($1::int[]) ORDER BY grade, section`,
        [uniqueClassIds],
      );
      if (classes.rows.length !== uniqueClassIds.length) {
        throw new Error("One or more selected classes do not exist");
      }
      const cycle = await client.query(
        `INSERT INTO exam_cycles
           (name,exam_type,academic_year,start_date,end_date,created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [name.trim(), exam_type, academic_year, start_date || null, end_date || null, req.user.id],
      );
      const created = [];
      for (const classRow of classes.rows) {
        const result = await client.query(
          `INSERT INTO exams
             (name,exam_type,academic_year,class,section,start_date,end_date,
              default_total_marks,created_by,fee_clearance_required,
              fee_clearance_mode,fee_required_amount,fee_clearance_cutoff_date,
              exam_cycle_id,class_id,class_teacher_id,assignment_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           RETURNING *`,
          [
            name.trim(), exam_type, academic_year, classRow.grade, classRow.section,
            start_date || null, end_date || null, Number(default_total_marks),
            req.user.id, Boolean(fee_clearance_required), fee_clearance_mode,
            Number(fee_required_amount || 0), fee_clearance_cutoff_date || null,
            cycle.rows[0].id, classRow.id, classRow.teacher_id,
            classRow.teacher_id ? "assigned" : "unassigned",
          ],
        );
        created.push(result.rows[0]);
      }
      await client.query("COMMIT");
      return res.status(201).json({
        cycle: cycle.rows[0],
        exams: created,
        created_count: created.length,
        unassigned_count: created.filter((exam) => !exam.class_teacher_id).length,
      });
    }
    const classRecord = section
      ? await client.query(
          `SELECT id,teacher_id FROM classes
            WHERE LOWER(TRIM(COALESCE(NULLIF(grade,''),class_name)))=LOWER(TRIM($1))
              AND LOWER(TRIM(section))=LOWER(TRIM($2)) LIMIT 1`,
          [className, section],
        )
      : { rows: [] };
    const result = await client.query(
      `INSERT INTO exams
         (name, exam_type, academic_year, class, section, start_date, end_date,
          default_total_marks, created_by, fee_clearance_required,
          fee_clearance_mode, fee_required_amount, fee_clearance_cutoff_date,
          class_id,class_teacher_id,assignment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        name.trim(),
        exam_type,
        academic_year,
        className,
        section || null,
        start_date || null,
        end_date || null,
        Number(default_total_marks),
        req.user.id,
        Boolean(fee_clearance_required),
        fee_clearance_mode,
        Number(fee_required_amount || 0),
        fee_clearance_cutoff_date || null,
        classRecord.rows[0]?.id || null,
        classRecord.rows[0]?.teacher_id || null,
        classRecord.rows[0]?.teacher_id ? "assigned" : "unassigned",
      ],
    );
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("createExam:", error);
    res.status(400).json({ message: error.message || "Failed to create exam" });
  } finally {
    client.release();
  }
};

const updateExam = async (req, res) => {
  const {
    name,
    exam_type,
    academic_year,
    class: className,
    section,
    start_date,
    end_date,
    default_total_marks,
    status,
    fee_clearance_required,
    fee_clearance_mode,
    fee_required_amount,
    fee_clearance_cutoff_date,
  } = req.body;
  try {
    if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
      return res.status(400).json({ message: "Exam dates must be valid YYYY-MM-DD dates" });
    }
    if (start_date && end_date && start_date > end_date) {
      return res.status(400).json({ message: "Exam end date must be after start date" });
    }
    if (fee_clearance_mode && !["full", "amount"].includes(fee_clearance_mode)) {
      return res.status(400).json({ message: "Fee clearance mode must be full or amount" });
    }
    if (
      fee_clearance_required !== false &&
      fee_clearance_mode === "amount" &&
      Number(fee_required_amount) <= 0
    ) {
      return res.status(400).json({ message: "Required fee amount must be greater than zero" });
    }
    if (start_date || end_date) {
      const currentExam = await pool.query(
        "SELECT start_date,end_date,status FROM exams WHERE id=$1",
        [req.params.id],
      );
      if (!currentExam.rows.length) {
        return res.status(404).json({ message: "Exam not found" });
      }
      if (["submitted", "approved", "result_published"].includes(currentExam.rows[0].status)) {
        return res.status(409).json({
          message: "Exam dates cannot be changed after the class result is submitted",
        });
      }
      const effectiveStart =
        start_date || dateOnly(currentExam.rows[0].start_date);
      const effectiveEnd =
        end_date || dateOnly(currentExam.rows[0].end_date);
      if (!effectiveStart || !effectiveEnd) {
        return res.status(400).json({
          message: "Both exam start and end dates are required",
        });
      }
      const outsideSchedule = await pool.query(
        `SELECT subject,exam_date FROM exam_schedule
          WHERE exam_id=$1 AND (exam_date<$2::date OR exam_date>$3::date)
          ORDER BY exam_date LIMIT 1`,
        [req.params.id, effectiveStart, effectiveEnd],
      );
      if (outsideSchedule.rows.length) {
        const row = outsideSchedule.rows[0];
        return res.status(409).json({
          message: `${row.subject} is scheduled on ${dateOnly(
            row.exam_date,
          )}. Update the date sheet before narrowing the exam dates.`,
        });
      }
    }
    const result = await pool.query(
      `UPDATE exams SET
         name = COALESCE($1, name), exam_type = COALESCE($2, exam_type),
         academic_year = COALESCE($3, academic_year), class = COALESCE($4, class),
         section = $5, start_date = $6, end_date = $7,
         default_total_marks = COALESCE($8, default_total_marks),
         status = COALESCE($9, status),
         fee_clearance_required = COALESCE($10, fee_clearance_required),
         fee_clearance_mode = COALESCE($11, fee_clearance_mode),
         fee_required_amount = COALESCE($12, fee_required_amount),
         fee_clearance_cutoff_date = $13, updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [
        name,
        exam_type,
        academic_year,
        className,
        section || null,
        start_date || null,
        end_date || null,
        default_total_marks == null ? null : Number(default_total_marks),
        status,
        fee_clearance_required == null ? null : Boolean(fee_clearance_required),
        fee_clearance_mode || null,
        fee_required_amount == null ? null : Number(fee_required_amount),
        fee_clearance_cutoff_date || null,
        req.params.id,
      ],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Exam not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateExam:", error);
    res.status(500).json({ message: "Failed to update exam" });
  }
};

const deleteExam = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM exams WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Exam not found" });
    res.json({ message: "Exam deleted" });
  } catch (error) {
    console.error("deleteExam:", error);
    res.status(500).json({ message: "Failed to delete exam" });
  }
};

const getExamMarks = async (req, res) => {
  try {
    const examResult = await pool.query("SELECT * FROM exams WHERE id = $1", [
      req.params.id,
    ]);
    if (!examResult.rows.length)
      return res.status(404).json({ message: "Exam not found" });
    const exam = examResult.rows[0];
    const params = [exam.class];
    let studentFilter = "s.class = $1";
    if (exam.section) {
      params.push(exam.section);
      studentFilter += ` AND s.section = $${params.length}`;
    }
    params.push(exam.id);
    const examParam = params.length;
    const result = await pool.query(
      `SELECT s.id AS student_id, s.roll_number, s.class, s.section,
              u.name AS student_name, u.email,
              r.id AS result_id, r.subject, r.marks_obtained, r.total_marks,
              r.remarks, r.grade, r.published, r.updated_at
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN results r ON r.student_id = s.id AND r.exam_id = $${examParam}
       WHERE ${studentFilter}
       ORDER BY u.name, r.subject NULLS LAST`,
      params,
    );
    res.json({ exam, rows: result.rows });
  } catch (error) {
    console.error("getExamMarks:", error);
    res.status(500).json({ message: "Failed to load marks" });
  }
};

const saveMarks = async (req, res) => {
  const { marks } = req.body;
  if (!Array.isArray(marks) || !marks.length) {
    return res.status(400).json({ message: "Marks array is required" });
  }
  const examResult = await pool.query("SELECT * FROM exams WHERE id = $1", [
    req.params.id,
  ]);
  if (!examResult.rows.length)
    return res.status(404).json({ message: "Exam not found" });
  const exam = examResult.rows[0];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of marks) {
      if (
        !item.student_id ||
        !item.subject ||
        item.marks_obtained === "" ||
        item.marks_obtained == null
      ) {
        continue;
      }
      const obtained = Number(item.marks_obtained);
      const total = Number(item.total_marks || exam.default_total_marks || 100);
      if (obtained < 0 || total <= 0 || obtained > total) {
        throw new Error(`Invalid marks for ${item.subject}`);
      }
      const existing = await client.query(
        `SELECT id FROM results
         WHERE student_id = $1 AND exam_id = $2 AND LOWER(subject) = LOWER($3)
         LIMIT 1`,
        [item.student_id, exam.id, item.subject],
      );
      const values = [
        obtained,
        total,
        item.remarks || null,
        gradeFor(obtained, total),
        null,
        ["published", "result_published"].includes(exam.status),
        item.student_id,
        exam.id,
        item.subject.trim(),
      ];
      if (existing.rows.length) {
        await client.query(
          `UPDATE results SET marks_obtained = $1, total_marks = $2, remarks = $3,
             grade = $4, published = $6, subject = $9,
             exam_type = $10, exam_date = $11, updated_at = NOW()
           WHERE id = $12`,
          [
            ...values,
            exam.exam_type,
            exam.end_date || exam.start_date || null,
            existing.rows[0].id,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO results
             (student_id, subject, marks_obtained, total_marks, exam_type, exam_date,
              exam_id, remarks, grade, teacher_id, published)
           VALUES ($7,$9,$1,$2,$10,$11,$8,$3,$4,$5,$6)`,
          [...values, exam.exam_type, exam.end_date || exam.start_date || null],
        );
      }
    }
    await client.query("COMMIT");
    res.json({ message: "Marks saved successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("saveMarks:", error);
    res.status(400).json({ message: error.message || "Failed to save marks" });
  } finally {
    client.release();
  }
};

const getResultSubmissions = async (req, res) => {
  try {
    const { status, exam_id: examId } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    if (status) {
      params.push(status);
      where += ` AND rs.status = $${params.length}`;
    }
    if (examId) {
      params.push(examId);
      where += ` AND rs.exam_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT rs.*, e.name AS exam_name, e.class, e.academic_year,
              e.status AS exam_status,
              u.name AS teacher_name,
              COUNT(marked_student.id)::int AS marks_count
       FROM result_submissions rs
       JOIN exams e ON e.id = rs.exam_id
       JOIN teachers t ON t.id = rs.teacher_id
       JOIN users u ON u.id = t.user_id
       LEFT JOIN results r
         ON r.exam_id = rs.exam_id
        AND r.teacher_id = rs.teacher_id
        AND LOWER(TRIM(r.subject)) = LOWER(TRIM(rs.subject))
       LEFT JOIN students marked_student
         ON marked_student.id = r.student_id
        AND LOWER(TRIM(marked_student.section)) = LOWER(TRIM(rs.section))
       ${where}
       GROUP BY rs.id, e.id, u.name
       ORDER BY
         CASE rs.status WHEN 'submitted' THEN 0 WHEN 'returned' THEN 1
              WHEN 'approved' THEN 2 ELSE 3 END,
         rs.updated_at DESC`,
      params,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getResultSubmissions:", error);
    res.status(500).json({ message: "Failed to load result submissions" });
  }
};

const reviewResultSubmission = async (req, res) => {
  const { action, feedback = "" } = req.body;
  if (!["approve", "return"].includes(action)) {
    return res
      .status(400)
      .json({ message: "Action must be approve or return" });
  }
  if (action === "return" && !feedback.trim()) {
    return res
      .status(400)
      .json({ message: "Feedback is required when returning marks" });
  }
  try {
    const status = action === "approve" ? "approved" : "returned";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query(
        `SELECT exam_id,teacher_id,section FROM result_submissions
          WHERE id=$1 AND status IN ('submitted','approved') FOR UPDATE`,
        [req.params.id],
      );
      if (!target.rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ message: "Class result is not awaiting review" });
      }
      const row = target.rows[0];
      const result = await client.query(
        `UPDATE result_submissions
            SET status=$1,feedback=$2,reviewed_at=NOW(),reviewed_by=$3,updated_at=NOW()
          WHERE exam_id=$4 AND teacher_id=$5
            AND LOWER(TRIM(section))=LOWER(TRIM($6))
            AND status IN ('submitted','approved')
          RETURNING *`,
        [
          status,
          feedback.trim() || null,
          req.user.id,
          row.exam_id,
          row.teacher_id,
          row.section,
        ],
      );
      await client.query(
        "UPDATE exams SET status=$1,updated_at=NOW() WHERE id=$2",
        [status, row.exam_id],
      );
      await client.query("COMMIT");
      res.json({
        ...result.rows[0],
        reviewed_subjects: result.rowCount,
        message:
          action === "approve"
            ? "Complete class result approved"
            : "Complete class result returned to the class teacher",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("reviewResultSubmission:", error);
    res.status(500).json({ message: "Failed to review submission" });
  }
};

const releaseExam = async (req, res) => {
  try {
    const exam = await pool.query(
      `SELECT e.*,COALESCE(c.teacher_id,e.class_teacher_id) AS assigned_teacher_id
         FROM exams e LEFT JOIN classes c ON c.id=e.class_id
        WHERE e.id=$1`,
      [req.params.id],
    );
    if (!exam.rows.length) {
      return res.status(404).json({ message: "Exam not found" });
    }
    if (!exam.rows[0].assigned_teacher_id) {
      return res.status(409).json({
        message: "Assign a class teacher before releasing this exam",
      });
    }
    const schedule = await pool.query(
      `SELECT COUNT(*)::int AS subjects,
              COUNT(*) FILTER (WHERE published=TRUE)::int AS published
         FROM exam_schedule WHERE exam_id=$1`,
      [req.params.id],
    );
    if (!schedule.rows[0].subjects) {
      return res.status(409).json({
        message: "Create the subject-wise date sheet before releasing this exam",
      });
    }
    if (schedule.rows[0].published < schedule.rows[0].subjects) {
      return res.status(409).json({
        message: "Publish every date-sheet entry before releasing this exam",
      });
    }
    const result = await pool.query(
      `UPDATE exams SET status='released',
         class_teacher_id=$2,assignment_status='assigned',updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, exam.rows[0].assigned_teacher_id],
    );
    res.json({
      exam: result.rows[0],
      message: `Exam released to the class teacher with ${schedule.rows[0].subjects} subjects`,
    });
  } catch (error) {
    console.error("releaseExam:", error);
    res.status(500).json({ message: "Failed to release exam" });
  }
};

const publishExam = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const pending = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM result_submissions
         WHERE exam_id=$1 AND status <> 'approved'`,
        [req.params.id],
      );
      if (pending.rows[0].count > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: `${pending.rows[0].count} teacher submission(s) still need approval`,
        });
      }
      const lifecycle = await client.query(
        "SELECT status FROM exams WHERE id=$1 FOR UPDATE",
        [req.params.id],
      );
      if (!lifecycle.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Exam not found" });
      }
      if (lifecycle.rows[0].status !== "approved") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: "Approve the class-teacher result before publishing it",
        });
      }
      const readiness = await client.query(
        `SELECT COUNT(*)::int AS marks,
                COUNT(DISTINCT student_id)::int AS students,
                COUNT(*) FILTER (WHERE teacher_id IS NOT NULL)::int AS teacher_marks
           FROM results WHERE exam_id=$1`,
        [req.params.id],
      );
      if (!readiness.rows[0].marks || !readiness.rows[0].students) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: "Result cannot be published until class marks are entered and approved",
        });
      }
      if (readiness.rows[0].teacher_marks > 0) {
        const subjectReadiness = await client.query(
          `WITH target_exam AS (
             SELECT e.*, COALESCE(e.section,c.section) AS target_section
               FROM exams e LEFT JOIN classes c ON c.id=e.class_id
              WHERE e.id=$1
           ),
           expected AS (
             SELECT es.subject FROM exam_schedule es WHERE es.exam_id=$1
             UNION
             SELECT ts.subject
               FROM teacher_subjects ts, target_exam e
              WHERE LOWER(TRIM(ts.class_name))=LOWER(TRIM(e.class))
                AND LOWER(TRIM(ts.section))=LOWER(TRIM(e.target_section))
             UNION
             SELECT tt.subject
               FROM timetable tt, target_exam e
              WHERE tt.class_id=e.class_id
             UNION
             SELECT r.subject FROM results r WHERE r.exam_id=$1
           )
           SELECT
             (SELECT COUNT(*) FROM expected)::int AS expected,
             (SELECT COUNT(DISTINCT LOWER(TRIM(subject)))
                FROM result_submissions
               WHERE exam_id=$1 AND status='approved')::int AS approved`,
          [req.params.id],
        );
        if (subjectReadiness.rows[0].approved < subjectReadiness.rows[0].expected) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            message: `${subjectReadiness.rows[0].expected - subjectReadiness.rows[0].approved} class-teacher subject submission(s) still need approval`,
          });
        }
      }
      const exam = await client.query(
        "UPDATE exams SET status = 'result_published', updated_at = NOW() WHERE id = $1 RETURNING *",
        [req.params.id],
      );
      if (!exam.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Exam not found" });
      }
      await client.query(
        `UPDATE results r
         SET published = (
           r.teacher_id IS NULL OR EXISTS (
             SELECT 1 FROM result_submissions rs
             JOIN students result_student ON result_student.id = r.student_id
             WHERE rs.exam_id = r.exam_id
               AND rs.teacher_id = r.teacher_id
               AND LOWER(TRIM(rs.subject)) = LOWER(TRIM(r.subject))
               AND LOWER(TRIM(rs.section)) = LOWER(TRIM(result_student.section))
               AND rs.status = 'approved'
           )
         ), updated_at = NOW()
         WHERE r.exam_id = $1`,
        [req.params.id],
      );
      await client.query("COMMIT");
      const clearance = await getExamClearance(req.params.id);
      res.json({
        exam: exam.rows[0],
        fee_clearance: clearance?.summary || null,
        message: clearance?.summary?.blocked
          ? `Exam published. ${clearance.summary.eligible} result(s) available and ${clearance.summary.blocked} locked for pending fees.`
          : "Exam published. All eligible students can view their results.",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("publishExam:", error);
    res.status(500).json({ message: "Failed to publish exam" });
  }
};

const getFeeClearance = async (req, res) => {
  try {
    const clearance = await getExamClearance(req.params.id);
    if (!clearance) return res.status(404).json({ message: "Exam not found" });
    res.json(clearance);
  } catch (error) {
    console.error("getFeeClearance:", error);
    res.status(500).json({ message: "Failed to load result fee clearance" });
  }
};

const updateFeeClearanceOverride = async (req, res) => {
  const { allowed, reason } = req.body;
  if (allowed && !String(reason || "").trim()) {
    return res.status(400).json({ message: "Override reason is required" });
  }
  try {
    const student = await pool.query("SELECT id FROM students WHERE id=$1", [
      req.params.studentId,
    ]);
    if (!student.rows.length) return res.status(404).json({ message: "Student not found" });

    if (allowed) {
      await pool.query(
        `INSERT INTO result_fee_overrides
           (exam_id, student_id, reason, active, approved_by)
         VALUES ($1,$2,$3,TRUE,$4)
         ON CONFLICT (exam_id, student_id)
         DO UPDATE SET reason=EXCLUDED.reason, active=TRUE,
                       approved_by=EXCLUDED.approved_by, updated_at=NOW()`,
        [req.params.id, req.params.studentId, String(reason).trim(), req.user.id],
      );
    } else {
      await pool.query(
        `UPDATE result_fee_overrides
         SET active=FALSE, approved_by=$3, updated_at=NOW()
         WHERE exam_id=$1 AND student_id=$2`,
        [req.params.id, req.params.studentId, req.user.id],
      );
    }
    const clearance = await getExamClearance(req.params.id);
    res.json(clearance);
  } catch (error) {
    console.error("updateFeeClearanceOverride:", error);
    res.status(500).json({ message: "Failed to update fee override" });
  }
};

const getMarksheet = async (req, res) => {
  try {
    const [examResult, studentResult, marksResult] = await Promise.all([
      pool.query("SELECT * FROM exams WHERE id = $1", [req.params.examId]),
      pool.query(
        `SELECT s.*, u.name, u.email
         FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.id = $1`,
        [req.params.studentId],
      ),
      pool.query(
        `SELECT subject, marks_obtained, total_marks, remarks, grade
         FROM results
         WHERE exam_id = $1 AND student_id = $2
         ORDER BY subject`,
        [req.params.examId, req.params.studentId],
      ),
    ]);
    if (!examResult.rows.length || !studentResult.rows.length) {
      return res.status(404).json({ message: "Exam or student not found" });
    }
    const marks = marksResult.rows;
    const obtained = marks.reduce(
      (sum, row) => sum + Number(row.marks_obtained || 0),
      0,
    );
    const total = marks.reduce(
      (sum, row) => sum + Number(row.total_marks || 0),
      0,
    );
    const percentage =
      total > 0 ? Number(((obtained / total) * 100).toFixed(2)) : 0;
    res.json({
      exam: examResult.rows[0],
      student: studentResult.rows[0],
      marks,
      summary: {
        obtained,
        total,
        percentage,
        grade: gradeFor(obtained, total),
        status: percentage >= 33 ? "Pass" : "Fail",
      },
    });
  } catch (error) {
    console.error("getMarksheet:", error);
    res.status(500).json({ message: "Failed to generate marksheet" });
  }
};

const getUploads = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ru.*, e.name AS exam_name
       FROM result_uploads ru
       LEFT JOIN exams e ON e.id = ru.exam_id
       ORDER BY ru.created_at DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getUploads:", error);
    res.status(500).json({ message: "Failed to load uploads" });
  }
};

const uploadResultFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "File is required" });
  const examId = req.body.exam_id || null;
  let rowsImported = 0;
  let uploadKind = "document";
  try {
    if (req.file.originalname.toLowerCase().endsWith(".csv")) {
      if (!examId)
        return res
          .status(400)
          .json({ message: "Exam is required for CSV import" });
      uploadKind = "marks_csv";
      const text = fs
        .readFileSync(req.file.path, "utf8")
        .replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = parseCsvLine(lines.shift() || "").map((header) =>
        header.toLowerCase(),
      );
      const required = ["roll_number", "subject", "marks_obtained"];
      if (required.some((header) => !headers.includes(header))) {
        return res.status(400).json({
          message:
            "CSV requires roll_number, subject, and marks_obtained columns",
        });
      }
      const examResult = await pool.query("SELECT * FROM exams WHERE id = $1", [
        examId,
      ]);
      if (!examResult.rows.length)
        return res.status(404).json({ message: "Exam not found" });
      const exam = examResult.rows[0];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const line of lines) {
          const values = parseCsvLine(line);
          const row = Object.fromEntries(
            headers.map((header, index) => [header, values[index] || ""]),
          );
          const student = await client.query(
            "SELECT id FROM students WHERE roll_number = $1 LIMIT 1",
            [row.roll_number],
          );
          if (!student.rows.length || !row.subject || row.marks_obtained === "")
            continue;
          const total = Number(
            row.total_marks || exam.default_total_marks || 100,
          );
          const obtained = Number(row.marks_obtained);
          if (Number.isNaN(obtained) || obtained < 0 || obtained > total)
            continue;
          const existing = await client.query(
            `SELECT id FROM results
             WHERE student_id = $1 AND exam_id = $2 AND LOWER(subject) = LOWER($3) LIMIT 1`,
            [student.rows[0].id, exam.id, row.subject],
          );
          if (existing.rows.length) {
            await client.query(
              `UPDATE results SET marks_obtained=$1,total_marks=$2,remarks=$3,grade=$4,
               teacher_id=$5,subject=$6,updated_at=NOW() WHERE id=$7`,
              [
                obtained,
                total,
                row.remarks || null,
                gradeFor(obtained, total),
                null,
                row.subject,
                existing.rows[0].id,
              ],
            );
          } else {
            await client.query(
              `INSERT INTO results
                 (student_id, subject, marks_obtained, total_marks, exam_type, exam_date,
                  exam_id, remarks, grade, teacher_id, published)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [
                student.rows[0].id,
                row.subject,
                obtained,
                total,
                exam.exam_type,
                exam.end_date || exam.start_date || null,
                exam.id,
                row.remarks || null,
                gradeFor(obtained, total),
                null,
                ["published", "result_published"].includes(exam.status),
              ],
            );
          }
          rowsImported += 1;
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    const fileUrl = `/uploads/results/${req.file.filename}`;
    const saved = await pool.query(
      `INSERT INTO result_uploads
         (exam_id, original_name, stored_name, file_url, file_type, upload_kind,
          rows_imported, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        examId,
        req.file.originalname,
        req.file.filename,
        fileUrl,
        req.file.mimetype,
        uploadKind,
        rowsImported,
        req.user.id,
      ],
    );
    res.status(201).json(saved.rows[0]);
  } catch (error) {
    console.error("uploadResultFile:", error);
    res.status(500).json({ message: error.message || "Failed to upload file" });
  }
};

module.exports = {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  getExamMarks,
  saveMarks,
  getTeacherExams,
  getTeacherExamMarks,
  saveTeacherMarks,
  submitTeacherMarks,
  getResultSubmissions,
  reviewResultSubmission,
  releaseExam,
  publishExam,
  getFeeClearance,
  updateFeeClearanceOverride,
  getMarksheet,
  getUploads,
  uploadResultFile,
};
