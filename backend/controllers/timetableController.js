const pool = require("../config/db");

const PERIOD_SLOTS = {
  1: { start: "08:00:00", end: "08:45:00" },
  2: { start: "08:50:00", end: "09:35:00" },
  3: { start: "09:40:00", end: "10:25:00" },
  4: { start: "10:45:00", end: "11:30:00" },
  5: { start: "11:35:00", end: "12:20:00" },
  6: { start: "12:25:00", end: "13:10:00" },
  7: { start: "13:15:00", end: "14:00:00" },
};

const DEFAULT_WORKING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_PERIODS = Object.entries(PERIOD_SLOTS).map(([number, slot]) => ({
  number: Number(number),
  label: `P${number}`,
  start: slot.start.slice(0, 5),
  end: slot.end.slice(0, 5),
  type: "class",
}));

const DAY_ORDER_SQL = `CASE day_of_week
  WHEN 'Monday' THEN 1
  WHEN 'Tuesday' THEN 2
  WHEN 'Wednesday' THEN 3
  WHEN 'Thursday' THEN 4
  WHEN 'Friday' THEN 5
  WHEN 'Saturday' THEN 6
  ELSE 7
END`;

const PERIOD_NUMBER_SQL = `COALESCE(
  tt.period_number,
  CASE tt.start_time
    WHEN TIME '08:00:00' THEN 1
    WHEN TIME '08:50:00' THEN 2
    WHEN TIME '09:40:00' THEN 3
    WHEN TIME '10:45:00' THEN 4
    WHEN TIME '11:35:00' THEN 5
    WHEN TIME '12:25:00' THEN 6
    WHEN TIME '13:15:00' THEN 7
  END,
  ROW_NUMBER() OVER (
    PARTITION BY tt.class_id, tt.day_of_week
    ORDER BY tt.id
  )
)`;

function toTime(value) {
  if (!value) return null;
  const time = String(value).trim();
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  return null;
}

function normalizeSettings(row = {}) {
  const workingDays = Array.isArray(row.working_days) && row.working_days.length
    ? row.working_days
    : DEFAULT_WORKING_DAYS;

  const rawPeriods = Array.isArray(row.periods) && row.periods.length
    ? row.periods
    : DEFAULT_PERIODS;

  const periods = rawPeriods
    .map((period, index) => {
      const number = Number.parseInt(period.number ?? index + 1, 10);
      const start = String(period.start || "").slice(0, 5);
      const end = String(period.end || "").slice(0, 5);
      return {
        number,
        label: period.label || `P${number}`,
        start: /^\d{2}:\d{2}$/.test(start) ? start : DEFAULT_PERIODS[index]?.start || "08:00",
        end: /^\d{2}:\d{2}$/.test(end) ? end : DEFAULT_PERIODS[index]?.end || "08:45",
        type: period.type === "break" ? "break" : "class",
      };
    })
    .filter((period) => Number.isInteger(period.number) && period.number > 0)
    .sort((a, b) => a.number - b.number);

  return {
    working_days: workingDays,
    periods,
  };
}

async function getStoredSettings() {
  const result = await pool.query(
    "SELECT working_days, periods FROM timetable_settings WHERE id = 1"
  );
  return normalizeSettings(result.rows[0]);
}

function normalizePeriodNumber(value, settings = null) {
  const periodNumber = Number.parseInt(value, 10);
  if (!Number.isInteger(periodNumber) || periodNumber < 1) return null;
  if (!settings) return PERIOD_SLOTS[periodNumber] ? periodNumber : null;
  return settings.periods.some((period) => period.number === periodNumber) ? periodNumber : null;
}

function getPeriodSlot(periodNumber, settings = null) {
  const normalizedPeriod = normalizePeriodNumber(periodNumber, settings);
  if (!normalizedPeriod) return null;
  if (!settings) return PERIOD_SLOTS[normalizedPeriod] || null;
  const period = settings.periods.find((item) => item.number === normalizedPeriod);
  if (!period || period.type === "break") return null;
  return {
    start: toTime(period.start),
    end: toTime(period.end),
  };
}

function getPeriodNumberFromStartTime(startTime) {
  if (!startTime) return null;
  const timeValue = String(startTime).slice(0, 8);
  const match = Object.entries(PERIOD_SLOTS).find(([, slot]) => slot.start === timeValue);
  return match ? Number(match[0]) : null;
}

function createConflictError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

async function backfillMissingPeriodTimes(classId) {
  const settings = await getStoredSettings();
  const missingRows = await pool.query(
    `SELECT id, day_of_week, period_number
     FROM timetable
     WHERE class_id = $1
       AND (start_time IS NULL OR end_time IS NULL)
     ORDER BY ${DAY_ORDER_SQL}, id`,
    [classId]
  );

  if (missingRows.rows.length === 0) return;

  const rowsByDay = missingRows.rows.reduce((acc, row) => {
    if (!acc[row.day_of_week]) acc[row.day_of_week] = [];
    acc[row.day_of_week].push(row);
    return acc;
  }, {});

  for (const [dayOfWeek, rows] of Object.entries(rowsByDay)) {
    const occupiedRows = await pool.query(
      `SELECT start_time
       FROM timetable
       WHERE class_id = $1
         AND day_of_week = $2
         AND start_time IS NOT NULL
       ORDER BY start_time, id`,
      [classId, dayOfWeek]
    );

    const occupiedPeriods = new Set(
      occupiedRows.rows
        .map(row => getPeriodNumberFromStartTime(row.start_time))
        .filter(Boolean)
    );

    const availablePeriods = settings.periods
      .filter((period) => period.type !== "break")
      .map((period) => period.number)
      .filter(periodNumber => !occupiedPeriods.has(periodNumber));

    for (const [index, row] of rows.entries()) {
      const nextPeriod = normalizePeriodNumber(row.period_number, settings) || availablePeriods[index];
      if (!nextPeriod) break;

      const slot = getPeriodSlot(nextPeriod, settings);
      if (!slot) continue;
      await pool.query(
        `UPDATE timetable
         SET start_time = $1,
             end_time = $2,
             period_number = $3
         WHERE id = $4`,
        [slot.start, slot.end, nextPeriod, row.id]
      );
    }
  }
}

const ARRANGEMENT_TYPES = new Set([
  "substitute", "self_study", "library", "combined_class", "free_period",
]);

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function weekdayForDate(value) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

async function ensureNoConflicts({ classId, teacherId, dayOfWeek, startTime, excludeId = null }) {
  const classConflict = await pool.query(
    `SELECT id
     FROM timetable
     WHERE class_id = $1
       AND day_of_week = $2
       AND start_time = $3
       AND ($4::int IS NULL OR id <> $4)
     LIMIT 1`,
    [classId, dayOfWeek, startTime, excludeId]
  );

  if (classConflict.rows.length > 0) {
    throw createConflictError("This class already has a period in the selected day and slot.");
  }

  const teacherConflict = await pool.query(
    `SELECT id
     FROM timetable
     WHERE teacher_id = $1
       AND day_of_week = $2
       AND start_time = $3
       AND ($4::int IS NULL OR id <> $4)
     LIMIT 1`,
    [teacherId, dayOfWeek, startTime, excludeId]
  );

  if (teacherConflict.rows.length > 0) {
    throw createConflictError("This teacher is already assigned to another class in the selected day and slot.");
  }
}

// ── GET /api/admin/timetable?class_id=5
const getTimetable = async (req, res) => {
  const { class_id } = req.query;
  if (!class_id) return res.status(400).json({ message: "class_id is required" });

  try {
    await backfillMissingPeriodTimes(class_id);

    const result = await pool.query(
      `SELECT *
       FROM (
         SELECT
           tt.id,
           tt.class_id,
           tt.teacher_id,
           tt.subject,
           tt.day_of_week,
           tt.start_time,
           tt.end_time,
           ${PERIOD_NUMBER_SQL} AS period_number,
           u.name        AS teacher_name,
           t.employee_id AS teacher_code,
           t.profile_picture,
           ar.id          AS arrangement_id,
           ar.arrangement_date,
           ar.arrangement_type,
           ar.substitute_teacher_id,
           ar.substitute_teacher_name
         FROM timetable tt
         JOIN teachers t ON tt.teacher_id = t.id
         JOIN users    u ON t.user_id     = u.id
         LEFT JOIN LATERAL (
           SELECT ta.id, ta.arrangement_date, ta.arrangement_type,
                  ta.substitute_teacher_id, su.name AS substitute_teacher_name
           FROM teacher_arrangements ta
           LEFT JOIN teachers st ON st.id=ta.substitute_teacher_id
           LEFT JOIN users su ON su.id=st.user_id
           WHERE ta.timetable_id=tt.id AND ta.status='assigned'
             AND ta.arrangement_date>=CURRENT_DATE
           ORDER BY ta.arrangement_date
           LIMIT 1
         ) ar ON TRUE
         WHERE tt.class_id = $1
       ) timetable_rows
       ORDER BY ${DAY_ORDER_SQL}, period_number, id`,
      [class_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getTimetable:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getTimetableSettings = async (req, res) => {
  try {
    const settings = await getStoredSettings();
    res.json(settings);
  } catch (err) {
    console.error("getTimetableSettings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateTimetableSettings = async (req, res) => {
  const settings = normalizeSettings(req.body || {});
  if (!settings.working_days.length || !settings.periods.length) {
    return res.status(400).json({ message: "At least one working day and one period are required." });
  }

  const invalidPeriod = settings.periods.find((period) => !toTime(period.start) || !toTime(period.end));
  if (invalidPeriod) {
    return res.status(400).json({ message: "Every period needs valid start and end times." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO timetable_settings (id, working_days, periods, updated_by, updated_at)
       VALUES (1, $1::jsonb, $2::jsonb, $3, NOW())
       ON CONFLICT (id) DO UPDATE
       SET working_days = EXCLUDED.working_days,
           periods = EXCLUDED.periods,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING working_days, periods`,
      [
        JSON.stringify(settings.working_days),
        JSON.stringify(settings.periods),
        req.user?.id || null,
      ]
    );
    res.json(normalizeSettings(result.rows[0]));
  } catch (err) {
    console.error("updateTimetableSettings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/admin/timetable
const createPeriod = async (req, res) => {
  const { class_id, teacher_id, subject, day_of_week, period_number } = req.body;
  const settings = await getStoredSettings();
  const slot = getPeriodSlot(period_number, settings);

  if (!class_id || !teacher_id || !subject || !day_of_week || !slot || !settings.working_days.includes(day_of_week)) {
    return res.status(400).json({
      message: "class_id, teacher_id, subject, working day, and a valid class period are required",
    });
  }

  try {
    await backfillMissingPeriodTimes(class_id);
    await ensureNoConflicts({
      classId: class_id,
      teacherId: teacher_id,
      dayOfWeek: day_of_week,
      startTime: slot.start,
    });

    const result = await pool.query(
      `INSERT INTO timetable (class_id, teacher_id, subject, day_of_week, start_time, end_time, period_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [class_id, teacher_id, subject, day_of_week, slot.start, slot.end, normalizePeriodNumber(period_number, settings)]
    );
    res.status(201).json({ ...result.rows[0], period_number: normalizePeriodNumber(period_number, settings) });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    if (err.code === "23505") {
      if (err.constraint?.includes("teacher"))
        return res.status(409).json({ message: "This teacher already has a class on this day." });
      return res.status(409).json({ message: "This class already has a period on this day." });
    }
    console.error("createPeriod:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── PUT /api/admin/timetable/:id
const updatePeriod = async (req, res) => {
  const { id } = req.params;
  const { teacher_id, subject, day_of_week, period_number } = req.body;

  try {
    const settings = await getStoredSettings();
    const existingResult = await pool.query(
      `SELECT id, class_id, teacher_id, subject, day_of_week, start_time
       FROM timetable
       WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: "Period not found" });
    }

    const existingPeriod = existingResult.rows[0];
    const nextTeacherId = teacher_id ?? existingPeriod.teacher_id;
    const nextSubject = subject ?? existingPeriod.subject;
    const nextDayOfWeek = day_of_week ?? existingPeriod.day_of_week;
    const nextPeriodNumber =
      normalizePeriodNumber(period_number, settings) ??
      getPeriodNumberFromStartTime(existingPeriod.start_time);
    const slot = getPeriodSlot(nextPeriodNumber, settings);

    if (!slot || !settings.working_days.includes(nextDayOfWeek)) {
      return res.status(400).json({ message: "A valid working day and class period are required" });
    }

    await backfillMissingPeriodTimes(existingPeriod.class_id);
    await ensureNoConflicts({
      classId: existingPeriod.class_id,
      teacherId: nextTeacherId,
      dayOfWeek: nextDayOfWeek,
      startTime: slot.start,
      excludeId: Number(id),
    });

    const result = await pool.query(
      `UPDATE timetable
       SET teacher_id  = $1,
           subject     = $2,
           day_of_week = $3,
           start_time  = $4,
           end_time    = $5,
           period_number = $6
       WHERE id = $7
       RETURNING *`,
      [nextTeacherId, nextSubject, nextDayOfWeek, slot.start, slot.end, nextPeriodNumber, id]
    );
    res.json({ ...result.rows[0], period_number: nextPeriodNumber });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    if (err.code === "23505") {
      if (err.constraint?.includes("teacher"))
        return res.status(409).json({ message: "This teacher already has a class on this day." });
      return res.status(409).json({ message: "This class already has a period on this day." });
    }
    console.error("updatePeriod:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── DELETE /api/admin/timetable/:id
const deletePeriod = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM timetable WHERE id = $1 RETURNING id", [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Period not found" });
    res.json({ message: "Period deleted" });
  } catch (err) {
    console.error("deletePeriod:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getArrangementOptions = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  if (!isValidDate(date)) return res.status(400).json({ message: "A valid arrangement date is required" });

  try {
    const periodResult = await pool.query(
      `SELECT tt.*, u.name AS original_teacher_name, c.grade, c.section
       FROM timetable tt
       JOIN teachers t ON t.id=tt.teacher_id
       JOIN users u ON u.id=t.user_id
       LEFT JOIN classes c ON c.id=tt.class_id
       WHERE tt.id=$1`,
      [id],
    );
    if (!periodResult.rows.length) return res.status(404).json({ message: "Period not found" });
    const period = periodResult.rows[0];
    if (weekdayForDate(date) !== period.day_of_week) {
      return res.status(400).json({ message: `Selected date must be a ${period.day_of_week}` });
    }

    const [attendance, existing, suggestions] = await Promise.all([
      pool.query("SELECT status FROM teacher_attendance WHERE teacher_id=$1 AND date=$2", [period.teacher_id, date]),
      pool.query(
        `SELECT ta.*, u.name AS substitute_teacher_name
         FROM teacher_arrangements ta
         LEFT JOIN teachers st ON st.id=ta.substitute_teacher_id
         LEFT JOIN users u ON u.id=st.user_id
         WHERE ta.timetable_id=$1 AND ta.arrangement_date=$2`,
        [id, date],
      ),
      pool.query(
        `SELECT t.id, u.name, t.employee_id,
                COALESCE(NULLIF(BTRIM(t.subject), ''),
                  (SELECT STRING_AGG(DISTINCT ts.subject, ', ' ORDER BY ts.subject)
                   FROM teacher_subjects ts WHERE ts.teacher_id=t.id)) AS subject,
                (LOWER(COALESCE(t.subject,''))=LOWER($1) OR EXISTS (
                  SELECT 1 FROM teacher_subjects match_subject
                  WHERE match_subject.teacher_id=t.id AND LOWER(match_subject.subject)=LOWER($1)
                )) AS subject_match,
                (SELECT COUNT(*)::int FROM timetable own
                  WHERE own.teacher_id=t.id AND own.day_of_week=$2) AS daily_load
         FROM teachers t
         JOIN users u ON u.id=t.user_id AND u.is_active=TRUE
         WHERE t.id<>$3
           AND NOT EXISTS (
             SELECT 1 FROM teacher_attendance a
             WHERE a.teacher_id=t.id AND a.date=$4 AND LOWER(a.status) IN ('absent','leave')
           )
           AND NOT EXISTS (
             SELECT 1 FROM timetable busy
             WHERE busy.teacher_id=t.id AND busy.day_of_week=$2 AND busy.start_time=$5
           )
           AND NOT EXISTS (
             SELECT 1 FROM teacher_arrangements ar
             JOIN timetable art ON art.id=ar.timetable_id
             WHERE ar.substitute_teacher_id=t.id AND ar.arrangement_date=$4
               AND ar.status='assigned' AND art.start_time=$5
               AND ar.timetable_id<>$6
           )
         ORDER BY subject_match DESC, daily_load ASC, u.name`,
        [period.subject, period.day_of_week, period.teacher_id, date, period.start_time, id],
      ),
    ]);

    const attendanceStatus = attendance.rows[0]?.status || "Not marked";
    res.json({
      period,
      arrangement_date: date,
      original_teacher_status: attendanceStatus,
      arrangement_required: ["absent", "leave"].includes(attendanceStatus.toLowerCase()),
      current_arrangement: existing.rows[0] || null,
      suggestions: suggestions.rows,
    });
  } catch (err) {
    console.error("getArrangementOptions:", err);
    res.status(500).json({ message: "Failed to load teacher availability" });
  }
};

const saveArrangement = async (req, res) => {
  const { id } = req.params;
  const { arrangement_date, substitute_teacher_id = null, arrangement_type = "substitute", notes = null } = req.body;
  if (!isValidDate(arrangement_date) || !ARRANGEMENT_TYPES.has(arrangement_type)) {
    return res.status(400).json({ message: "Valid date and arrangement type are required" });
  }
  if (arrangement_type === "substitute" && !substitute_teacher_id) {
    return res.status(400).json({ message: "Select a substitute teacher" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const periodResult = await client.query("SELECT * FROM timetable WHERE id=$1 FOR UPDATE", [id]);
    if (!periodResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Period not found" });
    }
    const period = periodResult.rows[0];
    if (weekdayForDate(arrangement_date) !== period.day_of_week) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Selected date must be a ${period.day_of_week}` });
    }

    if (arrangement_type === "substitute") {
      const available = await client.query(
        `SELECT t.id FROM teachers t JOIN users u ON u.id=t.user_id AND u.is_active=TRUE
         WHERE t.id=$1 AND t.id<>$2
           AND NOT EXISTS (SELECT 1 FROM teacher_attendance a WHERE a.teacher_id=t.id AND a.date=$3 AND LOWER(a.status) IN ('absent','leave'))
           AND NOT EXISTS (SELECT 1 FROM timetable tt WHERE tt.teacher_id=t.id AND tt.day_of_week=$4 AND tt.start_time=$5)
           AND NOT EXISTS (
             SELECT 1 FROM teacher_arrangements ar JOIN timetable tt ON tt.id=ar.timetable_id
             WHERE ar.substitute_teacher_id=t.id AND ar.arrangement_date=$3 AND ar.status='assigned'
               AND tt.start_time=$5 AND ar.timetable_id<>$6
           )`,
        [substitute_teacher_id, period.teacher_id, arrangement_date, period.day_of_week, period.start_time, id],
      );
      if (!available.rows.length) throw createConflictError("Selected teacher is absent or busy in this period");
    }

    const result = await client.query(
      `INSERT INTO teacher_arrangements
       (timetable_id, arrangement_date, original_teacher_id, substitute_teacher_id, arrangement_type, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'assigned',$7)
       ON CONFLICT (timetable_id, arrangement_date) DO UPDATE SET
         substitute_teacher_id=EXCLUDED.substitute_teacher_id,
         arrangement_type=EXCLUDED.arrangement_type, notes=EXCLUDED.notes,
         status='assigned', updated_at=NOW()
       RETURNING *`,
      [id, arrangement_date, period.teacher_id, substitute_teacher_id, arrangement_type, notes, req.user?.id || null],
    );
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.statusCode === 409) return res.status(409).json({ message: err.message });
    console.error("saveArrangement:", err);
    res.status(500).json({ message: "Failed to save teacher arrangement" });
  } finally {
    client.release();
  }
};

const cancelArrangement = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE teacher_arrangements SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ message: "Arrangement not found" });
    res.json({ message: "Arrangement cancelled" });
  } catch (err) {
    console.error("cancelArrangement:", err);
    res.status(500).json({ message: "Failed to cancel arrangement" });
  }
};

const getTimetableEvents = async (req, res) => {
  const { scope, class_id } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, title, event_type, scope, class_id, event_date, start_date, end_date,
              description, color, created_at, updated_at
       FROM timetable_events
       WHERE ($1::text IS NULL OR scope = $1)
         AND ($2::int IS NULL OR class_id = $2 OR class_id IS NULL)
       ORDER BY COALESCE(event_date, start_date), id`,
      [scope || null, class_id || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getTimetableEvents:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createTimetableEvent = async (req, res) => {
  const {
    title,
    event_type = "Event",
    scope = "monthly",
    class_id = null,
    event_date = null,
    start_date = null,
    end_date = null,
    description = null,
    color = "blue",
  } = req.body;

  if (!title || !["monthly", "yearly"].includes(scope)) {
    return res.status(400).json({ message: "Title and a valid scope are required." });
  }

  if (scope === "monthly" && !event_date) {
    return res.status(400).json({ message: "Monthly events need an event date." });
  }

  if (scope === "yearly" && (!start_date || !end_date)) {
    return res.status(400).json({ message: "Yearly events need a start and end date." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO timetable_events
       (title, event_type, scope, class_id, event_date, start_date, end_date, description, color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        title,
        event_type,
        scope,
        class_id || null,
        event_date || null,
        start_date || event_date || null,
        end_date || event_date || null,
        description,
        color,
        req.user?.id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createTimetableEvent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateTimetableEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    event_type,
    scope,
    class_id,
    event_date,
    start_date,
    end_date,
    description,
    color,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE timetable_events
       SET title = COALESCE($1, title),
           event_type = COALESCE($2, event_type),
           scope = COALESCE($3, scope),
           class_id = $4,
           event_date = $5,
           start_date = $6,
           end_date = $7,
           description = $8,
           color = COALESCE($9, color),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title,
        event_type,
        scope,
        class_id || null,
        event_date || null,
        start_date || event_date || null,
        end_date || event_date || null,
        description || null,
        color,
        id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Event not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateTimetableEvent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteTimetableEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM timetable_events WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("deleteTimetableEvent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getTimetable,
  createPeriod,
  updatePeriod,
  deletePeriod,
  getTimetableSettings,
  updateTimetableSettings,
  getTimetableEvents,
  createTimetableEvent,
  updateTimetableEvent,
  deleteTimetableEvent,
  getArrangementOptions,
  saveArrangement,
  cancelArrangement,
};
