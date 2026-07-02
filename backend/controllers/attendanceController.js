// controllers/attendanceController.js
const pool = require("../config/db");
const ExcelJS = require("exceljs");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: today's date in YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];

const assertClassAccess = async (user, classId, db = pool) => {
  if (user.role === "admin") return;
  if (user.role !== "teacher") {
    throw { status: 403, message: "Access denied" };
  }
  const teacher = await db.query("SELECT id FROM teachers WHERE user_id=$1", [
    user.id,
  ]);
  if (!teacher.rows.length) {
    throw { status: 404, message: "Teacher profile not found" };
  }
  const teacherId = teacher.rows[0].id;
  const allowed = await db.query(
    `SELECT 1
     FROM classes c
     WHERE c.id=$1 AND (
       c.teacher_id=$2 OR EXISTS (
         SELECT 1 FROM teacher_subjects ts
         WHERE ts.teacher_id=$2
           AND (ts.class_name=c.class_name OR ts.class_name=c.grade)
           AND (ts.section IS NULL OR ts.section='' OR ts.section=c.section)
       )
     )`,
    [classId, teacherId],
  );
  if (!allowed.rows.length) {
    throw { status: 403, message: "This class is not assigned to you" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/status
// Query: ?class_id=&date=YYYY-MM-DD (date optional → defaults to today)
// Used by teacher page on load to decide which UI to show
// ─────────────────────────────────────────────────────────────────────────────
exports.getStatus = async (req, res) => {
  try {
    const { class_id, date = todayStr() } = req.query;

    if (!class_id)
      return res.status(400).json({ message: "class_id is required" });
    await assertClassAccess(req.user, class_id);

    // 1. Holiday check
    const { rows: holidays } = await pool.query(
      `SELECT title FROM holidays WHERE date = $1`,
      [date],
    );
    if (holidays.length > 0) {
      return res.json({
        isHoliday: true,
        alreadyMarked: false,
        holidayTitle: holidays[0].title,
        message: `Today is a holiday: ${holidays[0].title}`,
        date,
      });
    }

    // 2. Already marked check
    const { rows: existing } = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE a.class_id = $1 AND a.date = $2`,
      [class_id, date],
    );
    const alreadyMarked = parseInt(existing[0].cnt) > 0;

    // 3. Total students in class
    const { rows: stuRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM students WHERE class_id = $1 AND is_active = true`,
      [class_id],
    );

    return res.json({
      isHoliday: false,
      alreadyMarked,
      markedCount: parseInt(existing[0].cnt),
      totalStudents: parseInt(stuRows[0].cnt),
      date,
      message: alreadyMarked
        ? "Attendance already marked for today."
        : "Attendance not yet marked.",
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("getStatus:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/mark
// Body: { class_id, date, records: [{ student_id, status, note? }] }
// ─────────────────────────────────────────────────────────────────────────────
exports.markAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { class_id, date = todayStr(), records } = req.body;

    // ── Validate input ────────────────────────────────────────────────────
    if (!class_id) throw { status: 400, message: "class_id is required." };
    if (!Array.isArray(records) || records.length === 0)
      throw { status: 400, message: "records array is required." };
    await assertClassAccess(req.user, class_id, client);

    // ── Holiday check ─────────────────────────────────────────────────────
    const { rows: holidays } = await client.query(
      `SELECT title FROM holidays WHERE date = $1`,
      [date],
    );
    if (holidays.length > 0)
      throw {
        status: 400,
        message: `Cannot mark attendance. ${date} is a holiday: ${holidays[0].title}`,
      };

    // ── Duplicate check ───────────────────────────────────────────────────
    const { rows: existing } = await client.query(
      `SELECT COUNT(*) AS cnt
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE a.class_id = $1 AND a.date = $2`,
      [class_id, date],
    );
    if (parseInt(existing[0].cnt) > 0)
      throw {
        status: 409,
        message: `Attendance for ${date} is already marked. Use edit to update.`,
      };

    // ── Insert all records ────────────────────────────────────────────────
    const validStatuses = ["Present", "Absent", "Leave"];
    for (const rec of records) {
      if (!rec.student_id)
        throw { status: 400, message: "Each record must have student_id." };
      if (!validStatuses.includes(rec.status))
        throw {
          status: 400,
          message: `Invalid status: ${rec.status}. Use Present, Absent, or Leave.`,
        };

      await client.query(
        `INSERT INTO attendance (student_id, class_id, date, status, marked_by, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          rec.student_id,
          class_id,
          date,
          rec.status,
          req.user.id,
          rec.note || null,
        ],
      );
    }

    await client.query("COMMIT");

    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const leave = records.filter((r) => r.status === "Leave").length;

    res.status(201).json({
      message: "Attendance marked successfully.",
      date,
      class_id,
      summary: { total: records.length, present, absent, leave },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("markAttendance:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/records
// Query: ?class_id=&date=
// Returns attendance records with student info for a class on a date
// ─────────────────────────────────────────────────────────────────────────────
exports.getRecords = async (req, res) => {
  try {
    const { class_id, date = todayStr() } = req.query;
    if (!class_id)
      return res.status(400).json({ message: "class_id is required" });
    await assertClassAccess(req.user, class_id);

    const { rows } = await pool.query(
      `SELECT
         a.id, a.student_id, a.date, a.status, a.note,
         s.roll_number, u.name, u.email,
         s.gender, s.photo_url
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN users    u ON u.id = s.user_id
       WHERE a.class_id = $1 AND a.date = $2
       ORDER BY s.roll_number, u.name`,
      [class_id, date],
    );

    res.json(rows);
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("getRecords:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/attendance/update
// Body: { class_id, date, records: [{ student_id, status, note? }] }
// Allow editing already-marked attendance
// ─────────────────────────────────────────────────────────────────────────────
exports.updateAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { class_id, date = todayStr(), records } = req.body;

    if (!class_id || !Array.isArray(records) || !records.length)
      throw { status: 400, message: "class_id and records are required." };
    await assertClassAccess(req.user, class_id, client);

    // Holiday check
    const { rows: holidays } = await client.query(
      `SELECT title FROM holidays WHERE date = $1`,
      [date],
    );
    if (holidays.length > 0)
      throw {
        status: 400,
        message: `${date} is a holiday: ${holidays[0].title}`,
      };

    const validStatuses = ["Present", "Absent", "Leave"];
    for (const rec of records) {
      if (!validStatuses.includes(rec.status))
        throw { status: 400, message: `Invalid status: ${rec.status}` };

      await client.query(
        `UPDATE attendance SET status = $1, note = $2, marked_by = $3, updated_at = NOW()
         WHERE student_id = $4 AND date = $5 AND class_id = $6`,
        [
          rec.status,
          rec.note || null,
          req.user.id,
          rec.student_id,
          date,
          class_id,
        ],
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Attendance updated successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("updateAttendance:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET /api/admin/attendance/report
// Query: ?class_id=&start_date=&end_date=
// ─────────────────────────────────────────────────────────────────────────────
exports.getReport = async (req, res) => {
  try {
    const {
      class_id,
      start_date = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0],
      end_date = todayStr(),
    } = req.query;

    if (!class_id)
      return res.status(400).json({ message: "class_id is required" });

    const { rows } = await pool.query(
      `SELECT
         s.id AS student_id,
         u.name,
         s.roll_number,
         COUNT(*)                                          FILTER (WHERE a.status = 'Present') AS present,
         COUNT(*)                                          FILTER (WHERE a.status = 'Absent')  AS absent,
         COUNT(*)                                          FILTER (WHERE a.status = 'Leave')   AS leave,
         COUNT(*)                                                                               AS total,
         ROUND(
           COUNT(*) FILTER (WHERE a.status = 'Present') * 100.0
           / NULLIF(COUNT(*), 0), 1
         )                                                                                     AS percent
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN attendance a ON a.student_id = s.id
         AND a.date BETWEEN $2 AND $3
         AND a.class_id = $1
       WHERE s.class_id = $1 AND s.is_active = true
       GROUP BY s.id, u.name, s.roll_number
       ORDER BY s.roll_number, u.name`,
      [class_id, start_date, end_date],
    );

    res.json({ data: rows, start_date, end_date });
  } catch (err) {
    console.error("getReport:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAYS CRUD (admin only)
// ─────────────────────────────────────────────────────────────────────────────

exports.getHolidays = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM holidays
       WHERE EXTRACT(YEAR FROM date) = $1
       ORDER BY date`,
      [year],
    );
    res.json(rows);
  } catch (err) {
    console.error("getHolidays:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { date, title, description } = req.body;
    if (!date || !title?.trim())
      return res.status(400).json({ message: "date and title are required." });

    const { rows } = await pool.query(
      `INSERT INTO holidays (date, title, description, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (date) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
       RETURNING *`,
      [date, title.trim(), description || null, req.user.id],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createHoliday:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    await pool.query(`DELETE FROM holidays WHERE id = $1`, [req.params.id]);
    res.json({ message: "Holiday deleted." });
  } catch (err) {
    console.error("deleteHoliday:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// GET /api/student/attendance?month=4&year=2026
exports.getStudentAttendance = async (req, res) => {
  try {
    const studentRow = await pool.query(
      `SELECT id, class_id FROM students WHERE user_id = $1`,
      [req.user.id],
    );
    if (!studentRow.rows.length)
      return res.status(404).json({ message: "Student not found" });

    const { id: student_id, class_id } = studentRow.rows[0];
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = new Date(year, month, 0).toISOString().split("T")[0];

    // Attendance records
    const { rows: attendance } = await pool.query(
      `SELECT date, status, note FROM attendance
       WHERE student_id = $1 AND date BETWEEN $2 AND $3
       ORDER BY date`,
      [student_id, start, end],
    );

    // Holidays
    const { rows: holidays } = await pool.query(
      `SELECT date, title FROM holidays
       WHERE date BETWEEN $1 AND $2 ORDER BY date`,
      [start, end],
    );

    // Monthly summary
    const present = attendance.filter((a) => a.status === "Present").length;
    const absent = attendance.filter((a) => a.status === "Absent").length;
    const leave = attendance.filter((a) => a.status === "Leave").length;
    const total = attendance.length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      attendance,
      holidays,
      summary: { present, absent, leave, total, percent },
      month,
      year,
    });
  } catch (err) {
    console.error("getStudentAttendance:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// TEACHER: GET /api/attendance/export?class_id=&year=2026
// Downloads full-year attendance Excel for a class
// npm install exceljs  (run in backend folder)
// ─────────────────────────────────────────────────────────────────────────────

exports.exportAttendanceExcel = async (req, res) => {
  try {
    const { class_id, year = new Date().getFullYear() } = req.query;
    if (!class_id)
      return res.status(400).json({ message: "class_id is required" });
    await assertClassAccess(req.user, class_id);

    // ── 1. Fetch class info ──────────────────────────────────────────────────
    const { rows: classRows } = await pool.query(
      `SELECT c.id, c.class_name, c.section, c.grade
       FROM classes c WHERE c.id = $1`,
      [class_id],
    );
    if (!classRows.length)
      return res.status(404).json({ message: "Class not found" });
    const cls = classRows[0];
    const className = `${cls.class_name || "Class " + cls.grade}-${cls.section}`;

    // ── 2. Fetch all active students ─────────────────────────────────────────
    const { rows: students } = await pool.query(
      `SELECT s.id, s.roll_number, s.gender, u.name, u.email
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.class_id = $1 AND s.is_active = true
       ORDER BY s.roll_number, u.name`,
      [class_id],
    );

    // ── 3. Fetch all attendance for the year ─────────────────────────────────
    const { rows: attendance } = await pool.query(
      `SELECT a.student_id, a.date, a.status
       FROM attendance a
       WHERE a.class_id = $1
         AND EXTRACT(YEAR FROM a.date) = $2
       ORDER BY a.date`,
      [class_id, year],
    );

    // ── 4. Fetch all holidays for the year ───────────────────────────────────
    const { rows: holidays } = await pool.query(
      `SELECT date, title FROM holidays
       WHERE EXTRACT(YEAR FROM date) = $1
       ORDER BY date`,
      [year],
    );
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().split("T")[0]),
    );

    // ── 5. Build attendance map: { student_id → { "YYYY-MM-DD" → status } } ─
    const attMap = {};
    students.forEach((s) => {
      attMap[s.id] = {};
    });
    attendance.forEach((a) => {
      const dateStr = new Date(a.date).toISOString().split("T")[0];
      if (attMap[a.student_id]) attMap[a.student_id][dateStr] = a.status;
    });

    // ── 6. Get all unique working dates (attendance marked dates) ────────────
    const allDatesSet = new Set(
      attendance.map((a) => new Date(a.date).toISOString().split("T")[0]),
    );
    const allDates = [...allDatesSet].sort();

    // ── 7. Group dates by month ──────────────────────────────────────────────
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthsMap = {}; // { "2026-04" → [dates] }
    allDates.forEach((d) => {
      const key = d.slice(0, 7);
      if (!monthsMap[key]) monthsMap[key] = [];
      monthsMap[key].push(d);
    });
    const months = Object.keys(monthsMap).sort();

    // ── 8. Build workbook ────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "EduERP";
    wb.created = new Date();

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1: Summary (Monthly attendance % per student)
    // ════════════════════════════════════════════════════════════════════════
    const summarySheet = wb.addWorksheet("Summary", {
      views: [{ state: "frozen", xSplit: 3, ySplit: 3 }],
    });

    // Colors
    const HEADER_BG = "1E3A5F";
    const SUBHEAD_BG = "2E6DA4";
    const GREEN_BG = "C6EFCE";
    const RED_BG = "FFC7CE";
    const AMBER_BG = "FFEB9C";
    const GRAY_BG = "F2F2F2";
    const WHITE = "FFFFFF";

    const headerFont = {
      name: "Arial",
      bold: true,
      color: { argb: "FF" + WHITE },
      size: 11,
    };
    const subFont = {
      name: "Arial",
      bold: true,
      color: { argb: "FF" + WHITE },
      size: 10,
    };
    const boldFont = { name: "Arial", bold: true, size: 10 };
    const normalFont = { name: "Arial", size: 10 };
    const centerAlign = { horizontal: "center", vertical: "middle" };
    const leftAlign = { horizontal: "left", vertical: "middle" };

    // Row 1: Title
    summarySheet.mergeCells(1, 1, 1, 3 + months.length * 4 + 1);
    const titleCell = summarySheet.getCell(1, 1);
    titleCell.value = `${className} — Attendance Summary ${year}`;
    titleCell.font = {
      name: "Arial",
      bold: true,
      size: 14,
      color: { argb: "FF" + WHITE },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + HEADER_BG },
    };
    titleCell.alignment = centerAlign;
    summarySheet.getRow(1).height = 30;

    // Row 2: Month headers (span 4 cols each: Present, Absent, Leave, %)
    summarySheet.getCell(2, 1).value = "Roll No.";
    summarySheet.getCell(2, 2).value = "Student Name";
    summarySheet.getCell(2, 3).value = "Gender";
    [1, 2, 3].forEach((c) => {
      const cell = summarySheet.getCell(2, c);
      cell.font = subFont;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + SUBHEAD_BG },
      };
      cell.alignment = centerAlign;
    });

    let col = 4;
    months.forEach((m) => {
      const [y, mo] = m.split("-");
      const label = `${monthNames[parseInt(mo) - 1]} ${y}`;
      summarySheet.mergeCells(2, col, 2, col + 3);
      const mc = summarySheet.getCell(2, col);
      mc.value = label;
      mc.font = subFont;
      mc.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + SUBHEAD_BG },
      };
      mc.alignment = centerAlign;
      // Sub-headers
      ["Present", "Absent", "Leave", "%"].forEach((lbl, i) => {
        const sc = summarySheet.getCell(3, col + i);
        sc.value = lbl;
        sc.font = boldFont;
        sc.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + GRAY_BG },
        };
        sc.alignment = centerAlign;
        sc.border = { bottom: { style: "thin" } };
      });
      col += 4;
    });

    // Total cols
    summarySheet.mergeCells(2, col, 2, col + 4);
    const totalHeader = summarySheet.getCell(2, col);
    totalHeader.value = "FULL YEAR TOTAL";
    totalHeader.font = subFont;
    totalHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + HEADER_BG },
    };
    totalHeader.alignment = centerAlign;
    ["School Days", "Present", "Absent", "Leave", "%"].forEach((lbl, i) => {
      const sc = summarySheet.getCell(3, col + i);
      sc.value = lbl;
      sc.font = boldFont;
      sc.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + GRAY_BG },
      };
      sc.alignment = centerAlign;
      sc.border = { bottom: { style: "thin" } };
    });

    summarySheet.getRow(2).height = 22;
    summarySheet.getRow(3).height = 18;

    // Row 3 col 1-3
    ["Roll No.", "Student Name", "Gender"].forEach((lbl, i) => {
      const sc = summarySheet.getCell(3, i + 1);
      sc.value = lbl;
      sc.font = boldFont;
      sc.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + GRAY_BG },
      };
      sc.alignment = centerAlign;
    });

    // Data rows
    students.forEach((student, si) => {
      const row = 4 + si;
      const isEven = si % 2 === 0;
      const rowBg = isEven ? "FFFFFF" : "F7F9FC";

      summarySheet.getCell(row, 1).value = student.roll_number || si + 1;
      summarySheet.getCell(row, 2).value = student.name;
      summarySheet.getCell(row, 3).value = student.gender || "—";
      [1, 2, 3].forEach((c) => {
        const cell = summarySheet.getCell(row, c);
        cell.font = normalFont;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + rowBg },
        };
        cell.alignment = c === 1 ? centerAlign : leftAlign;
      });

      let totalPresent = 0,
        totalAbsent = 0,
        totalLeave = 0,
        totalDays = 0;
      let dc = 4;
      months.forEach((m) => {
        const dates = monthsMap[m];
        const sMap = attMap[student.id] || {};
        const p = dates.filter((d) => sMap[d] === "Present").length;
        const a = dates.filter((d) => sMap[d] === "Absent").length;
        const l = dates.filter((d) => sMap[d] === "Leave").length;
        const t = dates.filter((d) => sMap[d]).length; // days where att was marked

        totalPresent += p;
        totalAbsent += a;
        totalLeave += l;
        totalDays += t;

        const pct = t > 0 ? Math.round((p / t) * 100) : 0;

        [p, a, l, pct + "%"].forEach((val, i) => {
          const cell = summarySheet.getCell(row, dc + i);
          cell.value = val;
          cell.font = normalFont;
          cell.alignment = centerAlign;
          let bg = rowBg;
          if (i === 0 && p > 0) bg = GREEN_BG;
          if (i === 1 && a > 0) bg = RED_BG;
          if (i === 2 && l > 0) bg = AMBER_BG;
          if (i === 3) {
            bg = pct >= 75 ? GREEN_BG : pct >= 50 ? AMBER_BG : RED_BG;
          }
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + bg },
          };
        });
        dc += 4;
      });

      // Year totals
      const yearPct =
        totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
      [totalDays, totalPresent, totalAbsent, totalLeave, yearPct + "%"].forEach(
        (val, i) => {
          const cell = summarySheet.getCell(row, dc + i);
          cell.value = val;
          cell.font = boldFont;
          cell.alignment = centerAlign;
          let bg = rowBg;
          if (i === 4)
            bg = yearPct >= 75 ? GREEN_BG : yearPct >= 50 ? AMBER_BG : RED_BG;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + bg },
          };
        },
      );

      summarySheet.getRow(row).height = 18;
    });

    // Column widths summary sheet
    summarySheet.getColumn(1).width = 10;
    summarySheet.getColumn(2).width = 22;
    summarySheet.getColumn(3).width = 10;
    for (let c = 4; c <= 4 + months.length * 4 + 5; c++) {
      summarySheet.getColumn(c).width = 9;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2+: One sheet per month with daily detail
    // ════════════════════════════════════════════════════════════════════════
    months.forEach((m) => {
      const [y, mo] = m.split("-");
      const monthLabel = `${monthNames[parseInt(mo) - 1]} ${y}`;
      const dates = monthsMap[m]; // working dates this month

      const ws = wb.addWorksheet(monthLabel, {
        views: [{ state: "frozen", xSplit: 3, ySplit: 3 }],
      });

      // Row 1: Title
      const totalCols = 3 + dates.length + 4;
      ws.mergeCells(1, 1, 1, totalCols);
      const t = ws.getCell(1, 1);
      t.value = `${className} — ${monthLabel} Attendance`;
      t.font = {
        name: "Arial",
        bold: true,
        size: 13,
        color: { argb: "FF" + WHITE },
      };
      t.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + HEADER_BG },
      };
      t.alignment = centerAlign;
      ws.getRow(1).height = 28;

      // Row 2: School open days info
      ws.mergeCells(2, 1, 2, totalCols);
      const hCount = dates.filter((d) => holidayDates.has(d)).length;
      const workingDays = dates.length - hCount;
      const infoCell = ws.getCell(2, 1);
      infoCell.value = `School Working Days: ${workingDays}   |   Holidays in marked dates: ${hCount}   |   Total Records: ${dates.length}`;
      infoCell.font = {
        name: "Arial",
        italic: true,
        size: 9,
        color: { argb: "FF555555" },
      };
      infoCell.alignment = centerAlign;
      ws.getRow(2).height = 16;

      // Row 3: Headers
      ws.getCell(3, 1).value = "Roll No.";
      ws.getCell(3, 2).value = "Student Name";
      ws.getCell(3, 3).value = "Gender";
      [1, 2, 3].forEach((c) => {
        const cell = ws.getCell(3, c);
        cell.font = boldFont;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + SUBHEAD_BG },
        };
        cell.font = {
          name: "Arial",
          bold: true,
          color: { argb: "FF" + WHITE },
          size: 10,
        };
        cell.alignment = centerAlign;
      });

      // Date headers
      dates.forEach((d, i) => {
        const dayNum = new Date(d).getDate();
        const dayName = new Date(d).toLocaleDateString("en-IN", {
          weekday: "short",
        });
        const isHoliday = holidayDates.has(d);
        const cell = ws.getCell(3, 4 + i);
        cell.value = `${dayNum}\n${dayName}`;
        cell.font = {
          name: "Arial",
          bold: true,
          size: 9,
          color: { argb: isHoliday ? "FFAA00CC" : "FF" + WHITE },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isHoliday ? "FFE8D5F5" : "FF" + SUBHEAD_BG },
        };
        cell.alignment = { ...centerAlign, wrapText: true };
        ws.getColumn(4 + i).width = 6;
      });

      // Summary headers
      const sc = 4 + dates.length;
      ["Present", "Absent", "Leave", "% Att"].forEach((lbl, i) => {
        const cell = ws.getCell(3, sc + i);
        cell.value = lbl;
        cell.font = boldFont;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + GRAY_BG },
        };
        cell.alignment = centerAlign;
        ws.getColumn(sc + i).width = 9;
      });

      ws.getRow(3).height = 32;

      // Data rows
      students.forEach((student, si) => {
        const row = 4 + si;
        const isEven = si % 2 === 0;
        const rowBg = isEven ? "FFFFFF" : "F7F9FC";
        const sMap = attMap[student.id] || {};

        ws.getCell(row, 1).value = student.roll_number || si + 1;
        ws.getCell(row, 2).value = student.name;
        ws.getCell(row, 3).value = student.gender || "—";
        [1, 2, 3].forEach((c) => {
          const cell = ws.getCell(row, c);
          cell.font = normalFont;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + rowBg },
          };
          cell.alignment = c === 1 ? centerAlign : leftAlign;
        });

        let p = 0,
          a = 0,
          l = 0;
        dates.forEach((d, i) => {
          const status = sMap[d];
          const cell = ws.getCell(row, 4 + i);
          let display = "—";
          let bg = rowBg;

          if (holidayDates.has(d)) {
            display = "H";
            bg = "E8D5F5";
          } else if (status === "Present") {
            display = "P";
            bg = GREEN_BG;
            p++;
          } else if (status === "Absent") {
            display = "A";
            bg = RED_BG;
            a++;
          } else if (status === "Leave") {
            display = "L";
            bg = AMBER_BG;
            l++;
          }

          cell.value = display;
          cell.font = { name: "Arial", size: 9, bold: status != null };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + bg },
          };
          cell.alignment = centerAlign;
        });

        const t = p + a + l;
        const pct = t > 0 ? Math.round((p / t) * 100) : 0;
        [p, a, l, pct + "%"].forEach((val, i) => {
          const cell = ws.getCell(row, sc + i);
          cell.value = val;
          cell.font = boldFont;
          cell.alignment = centerAlign;
          let bg = rowBg;
          if (i === 0 && p > 0) bg = GREEN_BG;
          if (i === 1 && a > 0) bg = RED_BG;
          if (i === 2 && l > 0) bg = AMBER_BG;
          if (i === 3)
            bg = pct >= 75 ? GREEN_BG : pct >= 50 ? AMBER_BG : RED_BG;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + bg },
          };
        });

        ws.getRow(row).height = 18;
      });

      // Column widths
      ws.getColumn(1).width = 10;
      ws.getColumn(2).width = 22;
      ws.getColumn(3).width = 10;
    });

    // ════════════════════════════════════════════════════════════════════════
    // SHEET LAST: Holidays list
    // ════════════════════════════════════════════════════════════════════════
    const hSheet = wb.addWorksheet("Holidays");
    hSheet.mergeCells("A1:C1");
    const hTitle = hSheet.getCell("A1");
    hTitle.value = `Holidays ${year}`;
    hTitle.font = {
      name: "Arial",
      bold: true,
      size: 12,
      color: { argb: "FF" + WHITE },
    };
    hTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + HEADER_BG },
    };
    hTitle.alignment = centerAlign;
    hSheet.getRow(1).height = 26;

    ["Date", "Day", "Holiday Name"].forEach((h, i) => {
      const cell = hSheet.getCell(2, i + 1);
      cell.value = h;
      cell.font = {
        name: "Arial",
        bold: true,
        color: { argb: "FF" + WHITE },
        size: 10,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + SUBHEAD_BG },
      };
      cell.alignment = centerAlign;
    });
    hSheet.getRow(2).height = 20;

    holidays.forEach((h, i) => {
      const d = new Date(h.date);
      const row = 3 + i;
      const bg = i % 2 === 0 ? "FFFFFF" : "F7F9FC";
      hSheet.getCell(row, 1).value = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      hSheet.getCell(row, 2).value = d.toLocaleDateString("en-IN", {
        weekday: "long",
      });
      hSheet.getCell(row, 3).value = h.title;
      [1, 2, 3].forEach((c) => {
        const cell = hSheet.getCell(row, c);
        cell.font = normalFont;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + bg },
        };
        cell.alignment = leftAlign;
      });
      hSheet.getRow(row).height = 18;
    });

    hSheet.getColumn(1).width = 16;
    hSheet.getColumn(2).width = 16;
    hSheet.getColumn(3).width = 30;

    // ── Send file ────────────────────────────────────────────────────────────
    const filename = `Attendance_${className.replace(/\s/g, "_")}_${year}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("exportAttendanceExcel:", err);
    res.status(500).json({ message: "Server error generating Excel" });
  }
};
