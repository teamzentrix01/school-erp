const crypto = require("crypto");
const QRCode = require("qrcode");
const pool = require("../config/db");

const markStudentAttendance = async (
  client,
  studentId,
  classId,
  date,
  method,
  markedBy,
) => {
  const updated = await client.query(
    `UPDATE attendance SET status='Present',note=$1,marked_by=$2,updated_at=NOW()
     WHERE student_id=$3 AND class_id=$4 AND date=$5 RETURNING id`,
    [`Marked via ${method}`, markedBy || null, studentId, classId, date],
  );
  if (!updated.rows.length) {
    await client.query(
      `INSERT INTO attendance(student_id,class_id,date,status,note,marked_by)
       VALUES ($1,$2,$3,'Present',$4,$5)`,
      [studentId, classId, date, `Marked via ${method}`, markedBy || null],
    );
  }
};

const getTeacherContext = async (userId) => {
  const teacher = await pool.query(
    "SELECT id FROM teachers WHERE user_id=$1",
    [userId],
  );
  if (!teacher.rows.length) throw new Error("Teacher profile not found");
  return teacher.rows[0];
};

const getSmartAttendance = async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const teacher = await getTeacherContext(req.user.id);
      const [sessions, events, classes] = await Promise.all([
        pool.query(
          `SELECT sas.*,c.grade,c.class_name,c.section,
                  COUNT(sae.id)::int AS event_count
           FROM smart_attendance_sessions sas
           JOIN classes c ON c.id=sas.class_id
           LEFT JOIN smart_attendance_events sae ON sae.session_id=sas.id
           WHERE sas.created_by=$1
           GROUP BY sas.id,c.id ORDER BY sas.created_at DESC LIMIT 100`,
          [req.user.id],
        ),
        pool.query(
          `SELECT sae.*,su.name AS subject_name,s.roll_number AS subject_code
           FROM smart_attendance_events sae
           JOIN smart_attendance_sessions sas ON sas.id=sae.session_id
           JOIN classes c ON c.id=sas.class_id
           JOIN students s ON s.id=sae.subject_id
           JOIN users su ON su.id=s.user_id
           WHERE sas.created_by=$1
           ORDER BY sae.event_time DESC LIMIT 200`,
          [req.user.id],
        ),
        pool.query(
          `SELECT DISTINCT c.id,COALESCE(c.grade,c.class_name) AS grade,c.section
           FROM classes c
           WHERE c.teacher_id=$1 OR EXISTS (
             SELECT 1 FROM teacher_subjects ts
             WHERE ts.teacher_id=$1
               AND (ts.class_name=c.class_name OR ts.class_name=c.grade)
               AND (ts.section IS NULL OR ts.section='' OR ts.section=c.section)
           )
           ORDER BY grade,section`,
          [teacher.id],
        ),
      ]);
      return res.json({
        sessions: sessions.rows,
        events: events.rows,
        classes: classes.rows,
        identities: [],
        students: [],
        teachers: [],
      });
    }
    const [sessions, events, identities, classes, students, teachers] =
      await Promise.all([
        pool.query(
          `SELECT sas.*,c.grade,c.class_name,c.section,
                  COUNT(sae.id)::int AS event_count
           FROM smart_attendance_sessions sas
           LEFT JOIN classes c ON c.id=sas.class_id
           LEFT JOIN smart_attendance_events sae ON sae.session_id=sas.id
           GROUP BY sas.id,c.id ORDER BY sas.created_at DESC LIMIT 100`,
        ),
        pool.query(
          `SELECT sae.*,
             CASE WHEN sae.subject_type='Student' THEN su.name ELSE tu.name END AS subject_name,
             CASE WHEN sae.subject_type='Student' THEN s.roll_number ELSE t.employee_id END AS subject_code
           FROM smart_attendance_events sae
           LEFT JOIN students s ON sae.subject_type='Student' AND s.id=sae.subject_id
           LEFT JOIN users su ON su.id=s.user_id
           LEFT JOIN teachers t ON sae.subject_type='Teacher' AND t.id=sae.subject_id
           LEFT JOIN users tu ON tu.id=t.user_id
           ORDER BY sae.event_time DESC LIMIT 200`,
        ),
        pool.query(
          `SELECT sai.*,
             CASE WHEN sai.subject_type='Student' THEN su.name ELSE tu.name END AS subject_name
           FROM smart_attendance_identities sai
           LEFT JOIN students s ON sai.subject_type='Student' AND s.id=sai.subject_id
           LEFT JOIN users su ON su.id=s.user_id
           LEFT JOIN teachers t ON sai.subject_type='Teacher' AND t.id=sai.subject_id
           LEFT JOIN users tu ON tu.id=t.user_id
           ORDER BY sai.enrolled_at DESC`,
        ),
        pool.query(
          "SELECT id,COALESCE(grade,class_name) AS grade,section FROM classes ORDER BY grade,section",
        ),
        pool.query(
          `SELECT s.id,s.roll_number,s.class,s.section,u.name
           FROM students s JOIN users u ON u.id=s.user_id
           WHERE COALESCE(s.is_active,TRUE)=TRUE ORDER BY u.name`,
        ),
        pool.query(
          `SELECT t.id,t.employee_id,u.name,t.department
           FROM teachers t JOIN users u ON u.id=t.user_id
           WHERE COALESCE(t.status,'Active')='Active' ORDER BY u.name`,
        ),
      ]);
    res.json({
      sessions: sessions.rows,
      events: events.rows,
      identities: identities.rows,
      classes: classes.rows,
      students: students.rows,
      teachers: teachers.rows,
    });
  } catch (error) {
    console.error("getSmartAttendance:", error);
    res.status(500).json({ message: "Failed to load smart attendance" });
  }
};

const createQrSession = async (req, res) => {
  const { class_id, expires_in_minutes = 15 } = req.body;
  const minutes = Math.min(Math.max(Number(expires_in_minutes), 1), 240);
  if (!class_id) return res.status(400).json({ message: "Class is required" });
  try {
    if (req.user.role === "teacher") {
      const teacher = await getTeacherContext(req.user.id);
      const assigned = await pool.query(
        `SELECT 1 FROM classes c
         WHERE c.id=$1 AND (
           c.teacher_id=$2 OR EXISTS (
             SELECT 1 FROM teacher_subjects ts
             WHERE ts.teacher_id=$2
               AND (ts.class_name=c.class_name OR ts.class_name=c.grade)
               AND (ts.section IS NULL OR ts.section='' OR ts.section=c.section)
           )
         )`,
        [class_id, teacher.id],
      );
      if (!assigned.rows.length) {
        return res.status(403).json({ message: "This class is not assigned to you" });
      }
    }
    const sessionCode = crypto.randomBytes(18).toString("base64url");
    const result = await pool.query(
      `INSERT INTO smart_attendance_sessions
         (session_code,attendance_method,subject_type,class_id,expires_at,created_by)
       VALUES ($1,'QR','Student',$2,NOW()+($3||' minutes')::interval,$4)
       RETURNING *`,
      [sessionCode, class_id, String(minutes), req.user.id],
    );
    const qrPayload = JSON.stringify({
      type: "EDUERP_ATTENDANCE",
      code: sessionCode,
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    res.status(201).json({ ...result.rows[0], qr_data_url: qrDataUrl });
  } catch (error) {
    console.error("createQrSession:", error);
    res.status(500).json({ message: "Failed to create QR session" });
  }
};

const closeSession = async (req, res) => {
  try {
    const ownershipClause =
      req.user.role === "teacher" ? " AND created_by=$2" : "";
    const values =
      req.user.role === "teacher"
        ? [req.params.id, req.user.id]
        : [req.params.id];
    const result = await pool.query(
      `UPDATE smart_attendance_sessions SET status='Closed'
       WHERE id=$1${ownershipClause} RETURNING *`,
      values,
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("closeSession:", error);
    res.status(500).json({ message: "Failed to close session" });
  }
};

const scanQrAttendance = async (req, res) => {
  let sessionCode = req.body.session_code;
  if (typeof sessionCode === "string" && sessionCode.trim().startsWith("{")) {
    try {
      sessionCode = JSON.parse(sessionCode).code;
    } catch {
      return res.status(400).json({ message: "Invalid QR code" });
    }
  }
  if (!sessionCode)
    return res.status(400).json({ message: "QR session code is required" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const session = await client.query(
      `SELECT * FROM smart_attendance_sessions
       WHERE session_code=$1 AND status='Active' AND expires_at>NOW()
       FOR UPDATE`,
      [sessionCode],
    );
    if (!session.rows.length)
      throw new Error("QR session is invalid or expired");
    const student = await client.query(
      "SELECT id,class_id FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (!student.rows.length) throw new Error("Student profile not found");
    if (Number(student.rows[0].class_id) !== Number(session.rows[0].class_id)) {
      throw new Error("This QR session belongs to another class");
    }
    const event = await client.query(
      `INSERT INTO smart_attendance_events
         (session_id,attendance_method,subject_type,subject_id,status,recorded_by)
       VALUES ($1,'QR','Student',$2,'Present',$3)
       ON CONFLICT(session_id,subject_type,subject_id)
       DO UPDATE SET event_time=NOW(),status='Present'
       RETURNING *`,
      [session.rows[0].id, student.rows[0].id, req.user.id],
    );
    await markStudentAttendance(
      client,
      student.rows[0].id,
      student.rows[0].class_id,
      session.rows[0].attendance_date,
      "QR",
      req.user.id,
    );
    await client.query("COMMIT");
    res.json({
      message: "Attendance marked successfully",
      event: event.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("scanQrAttendance:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to mark attendance" });
  } finally {
    client.release();
  }
};

const enrollIdentity = async (req, res) => {
  const {
    subject_type,
    subject_id,
    attendance_method,
    external_identifier,
    device_id,
    metadata = {},
  } = req.body;
  if (
    !["Student", "Teacher"].includes(subject_type) ||
    !["Face", "Biometric"].includes(attendance_method) ||
    !subject_id ||
    !external_identifier?.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Valid identity details are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO smart_attendance_identities
         (subject_type,subject_id,attendance_method,external_identifier,
          device_id,enrolled_by,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(subject_type,subject_id,attendance_method)
       DO UPDATE SET external_identifier=EXCLUDED.external_identifier,
         device_id=EXCLUDED.device_id,active=TRUE,enrolled_by=EXCLUDED.enrolled_by,
         enrolled_at=NOW(),metadata=EXCLUDED.metadata
       RETURNING *`,
      [
        subject_type,
        subject_id,
        attendance_method,
        external_identifier.trim(),
        device_id || null,
        req.user.id,
        metadata,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("enrollIdentity:", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "External identity is already assigned" });
    }
    res.status(500).json({ message: "Failed to enroll identity" });
  }
};

const recordDeviceEvent = async (req, res) => {
  const {
    external_identifier,
    attendance_method,
    device_id,
    event_type = "check_in",
    confidence,
    metadata = {},
  } = req.body;
  if (
    !external_identifier ||
    !["Face", "Biometric"].includes(attendance_method)
  ) {
    return res.status(400).json({ message: "Valid device event is required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const identity = await client.query(
      `SELECT * FROM smart_attendance_identities
       WHERE external_identifier=$1 AND attendance_method=$2 AND active=TRUE`,
      [external_identifier, attendance_method],
    );
    if (!identity.rows.length) throw new Error("Identity is not enrolled");
    const person = identity.rows[0];
    const event = await client.query(
      `INSERT INTO smart_attendance_events
         (attendance_method,subject_type,subject_id,status,device_id,
          external_reference,confidence,metadata,recorded_by)
       VALUES ($1,$2,$3,'Present',$4,$5,$6,$7,$8) RETURNING *`,
      [
        attendance_method,
        person.subject_type,
        person.subject_id,
        device_id || person.device_id,
        external_identifier,
        confidence || null,
        { ...metadata, event_type },
        req.user?.id || null,
      ],
    );
    if (person.subject_type === "Student") {
      const student = await client.query(
        "SELECT class_id FROM students WHERE id=$1",
        [person.subject_id],
      );
      if (!student.rows[0]?.class_id)
        throw new Error("Student class is not assigned");
      await markStudentAttendance(
        client,
        person.subject_id,
        student.rows[0].class_id,
        new Date().toISOString().slice(0, 10),
        attendance_method,
        req.user?.id,
      );
    } else {
      await client.query(
        `INSERT INTO teacher_attendance
           (teacher_id,date,status,check_in,check_out,attendance_method,device_id)
         VALUES ($1,CURRENT_DATE,'Present',
                 CASE WHEN $2='check_in' THEN NOW() END,
                 CASE WHEN $2='check_out' THEN NOW() END,$3,$4)
         ON CONFLICT(teacher_id,date)
         DO UPDATE SET status='Present',
           check_in=COALESCE(teacher_attendance.check_in,
             CASE WHEN $2='check_in' THEN NOW() END),
           check_out=CASE WHEN $2='check_out' THEN NOW()
                          ELSE teacher_attendance.check_out END,
           attendance_method=$3,device_id=$4,updated_at=NOW()`,
        [
          person.subject_id,
          event_type,
          attendance_method,
          device_id || person.device_id,
        ],
      );
    }
    await client.query("COMMIT");
    res
      .status(201)
      .json({ message: "Device attendance recorded", event: event.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("recordDeviceEvent:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to record device event" });
  } finally {
    client.release();
  }
};

module.exports = {
  getSmartAttendance,
  createQrSession,
  closeSession,
  scanQrAttendance,
  enrollIdentity,
  recordDeviceEvent,
};
