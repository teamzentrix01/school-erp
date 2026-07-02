const pool = require("../config/db");

const recalculateLatestFee = async (client, studentId, hostelFee, messFee) => {
  await client.query(
    `UPDATE student_fees
     SET hostel_fee = $1,
         mess_fee = $2,
         total_fees = tuition_fee + library_fee + other_fee
                    + COALESCE(transport_fee, 0) + $1 + $2,
         updated_at = NOW()
     WHERE student_id = $3
       AND academic_year = (
         SELECT academic_year FROM student_fees
         WHERE student_id = $3
         ORDER BY created_at DESC
         LIMIT 1
       )`,
    [Number(hostelFee || 0), Number(messFee || 0), studentId],
  );
};

const ensureBeds = async (client, roomId, totalBeds) => {
  const existing = await client.query(
    "SELECT COUNT(*)::int AS count FROM hostel_beds WHERE room_id = $1",
    [roomId],
  );
  for (
    let index = existing.rows[0].count + 1;
    index <= Number(totalBeds);
    index += 1
  ) {
    await client.query(
      `INSERT INTO hostel_beds (room_id, bed_label)
       VALUES ($1, $2)
       ON CONFLICT (room_id, bed_label) DO NOTHING`,
      [roomId, `Bed ${index}`],
    );
  }
};

const getHostelOverview = async (_req, res) => {
  try {
    const [hostels, rooms, beds, allocations, students, leaves, complaints] =
      await Promise.all([
        pool.query(`
          SELECT h.*,
                 COUNT(DISTINCT r.id)::int AS rooms_count,
                 COUNT(DISTINCT b.id)::int AS beds_count,
                 COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'Active')::int AS occupied_count
          FROM hostels h
          LEFT JOIN hostel_rooms r ON r.hostel_id = h.id
          LEFT JOIN hostel_beds b ON b.room_id = r.id
          LEFT JOIN student_hostel_allocations a ON a.hostel_id = h.id AND a.status = 'Active'
          GROUP BY h.id
          ORDER BY h.name
        `),
        pool.query(`
          SELECT r.*, h.name AS hostel_name,
                 COUNT(b.id)::int AS beds_count,
                 COUNT(b.id) FILTER (WHERE b.status = 'Occupied')::int AS occupied_count
          FROM hostel_rooms r
          JOIN hostels h ON h.id = r.hostel_id
          LEFT JOIN hostel_beds b ON b.room_id = r.id
          GROUP BY r.id, h.name
          ORDER BY h.name, r.room_number
        `),
        pool.query(`
          SELECT b.*, r.room_number, h.name AS hostel_name
          FROM hostel_beds b
          JOIN hostel_rooms r ON r.id = b.room_id
          JOIN hostels h ON h.id = r.hostel_id
          ORDER BY h.name, r.room_number, b.bed_label
        `),
        pool.query(`
          SELECT a.*, u.name AS student_name, u.email, s.roll_number, s.class, s.section,
                 h.name AS hostel_name, r.room_number, b.bed_label
          FROM student_hostel_allocations a
          JOIN students s ON s.id = a.student_id
          JOIN users u ON u.id = s.user_id
          JOIN hostels h ON h.id = a.hostel_id
          JOIN hostel_rooms r ON r.id = a.room_id
          JOIN hostel_beds b ON b.id = a.bed_id
          ORDER BY a.status, u.name
        `),
        pool.query(`
          SELECT s.id, s.roll_number, s.class, s.section, u.name, u.email
          FROM students s
          JOIN users u ON u.id = s.user_id
          WHERE COALESCE(s.is_active, TRUE) = TRUE
          ORDER BY u.name
        `),
        pool.query(`
          SELECT lr.*, u.name AS student_name, s.roll_number, h.name AS hostel_name,
                 r.room_number
          FROM hostel_leave_requests lr
          JOIN students s ON s.id = lr.student_id
          JOIN users u ON u.id = s.user_id
          LEFT JOIN student_hostel_allocations a ON a.id = lr.allocation_id
          LEFT JOIN hostels h ON h.id = a.hostel_id
          LEFT JOIN hostel_rooms r ON r.id = a.room_id
          ORDER BY lr.created_at DESC
          LIMIT 100
        `),
        pool.query(`
          SELECT c.*, u.name AS student_name, s.roll_number, h.name AS hostel_name,
                 r.room_number
          FROM hostel_complaints c
          JOIN students s ON s.id = c.student_id
          JOIN users u ON u.id = s.user_id
          LEFT JOIN student_hostel_allocations a ON a.id = c.allocation_id
          LEFT JOIN hostels h ON h.id = a.hostel_id
          LEFT JOIN hostel_rooms r ON r.id = a.room_id
          ORDER BY c.created_at DESC
          LIMIT 100
        `),
      ]);

    res.json({
      hostels: hostels.rows,
      rooms: rooms.rows,
      beds: beds.rows,
      allocations: allocations.rows,
      students: students.rows,
      leaves: leaves.rows,
      complaints: complaints.rows,
    });
  } catch (error) {
    console.error("getHostelOverview:", error);
    res.status(500).json({ message: "Failed to load hostel data" });
  }
};

const saveHostel = async (req, res) => {
  const {
    name,
    hostel_type = "Boys",
    address,
    warden_name,
    warden_phone,
    capacity = 0,
    status = "Active",
  } = req.body;
  if (!name)
    return res.status(400).json({ message: "Hostel name is required" });
  try {
    const result = await pool.query(
      `INSERT INTO hostels
         (name, hostel_type, address, warden_name, warden_phone, capacity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        name.trim(),
        hostel_type,
        address || null,
        warden_name || null,
        warden_phone || null,
        Number(capacity || 0),
        status,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("saveHostel:", error);
    res.status(500).json({ message: "Failed to save hostel" });
  }
};

const updateHostel = async (req, res) => {
  const {
    name,
    hostel_type,
    address,
    warden_name,
    warden_phone,
    capacity,
    status,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hostels SET
         name = COALESCE($1, name),
         hostel_type = COALESCE($2, hostel_type),
         address = $3,
         warden_name = $4,
         warden_phone = $5,
         capacity = COALESCE($6, capacity),
         status = COALESCE($7, status),
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name,
        hostel_type,
        address || null,
        warden_name || null,
        warden_phone || null,
        capacity == null ? null : Number(capacity),
        status,
        req.params.id,
      ],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Hostel not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateHostel:", error);
    res.status(500).json({ message: "Failed to update hostel" });
  }
};

const deleteHostel = async (req, res) => {
  try {
    const active = await pool.query(
      "SELECT id FROM student_hostel_allocations WHERE hostel_id = $1 AND status = 'Active' LIMIT 1",
      [req.params.id],
    );
    if (active.rows.length) {
      return res
        .status(400)
        .json({ message: "Vacate assigned students before deleting hostel" });
    }
    const result = await pool.query(
      "DELETE FROM hostels WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Hostel not found" });
    res.json({ message: "Hostel deleted" });
  } catch (error) {
    console.error("deleteHostel:", error);
    res.status(500).json({ message: "Failed to delete hostel" });
  }
};

const saveRoom = async (req, res) => {
  const {
    hostel_id,
    room_number,
    floor,
    room_type = "Dorm",
    total_beds = 1,
    monthly_fee = 0,
    mess_fee = 0,
    status = "Available",
  } = req.body;
  if (!hostel_id || !room_number) {
    return res
      .status(400)
      .json({ message: "Hostel and room number are required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO hostel_rooms
         (hostel_id, room_number, floor, room_type, total_beds, monthly_fee, mess_fee, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        hostel_id,
        room_number.trim(),
        floor || null,
        room_type,
        Number(total_beds || 1),
        Number(monthly_fee || 0),
        Number(mess_fee || 0),
        status,
      ],
    );
    await ensureBeds(client, result.rows[0].id, total_beds);
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Room number already exists in this hostel" });
    }
    console.error("saveRoom:", error);
    res.status(500).json({ message: "Failed to save room" });
  } finally {
    client.release();
  }
};

const updateRoom = async (req, res) => {
  const {
    hostel_id,
    room_number,
    floor,
    room_type,
    total_beds,
    monthly_fee,
    mess_fee,
    status,
  } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE hostel_rooms SET
         hostel_id = COALESCE($1, hostel_id),
         room_number = COALESCE($2, room_number),
         floor = $3,
         room_type = COALESCE($4, room_type),
         total_beds = COALESCE($5, total_beds),
         monthly_fee = COALESCE($6, monthly_fee),
         mess_fee = COALESCE($7, mess_fee),
         status = COALESCE($8, status),
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        hostel_id,
        room_number,
        floor || null,
        room_type,
        total_beds == null ? null : Number(total_beds),
        monthly_fee == null ? null : Number(monthly_fee),
        mess_fee == null ? null : Number(mess_fee),
        status,
        req.params.id,
      ],
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Room not found" });
    }
    await ensureBeds(client, req.params.id, result.rows[0].total_beds);
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("updateRoom:", error);
    res.status(500).json({ message: "Failed to update room" });
  } finally {
    client.release();
  }
};

const deleteRoom = async (req, res) => {
  try {
    const active = await pool.query(
      "SELECT id FROM student_hostel_allocations WHERE room_id = $1 AND status = 'Active' LIMIT 1",
      [req.params.id],
    );
    if (active.rows.length) {
      return res
        .status(400)
        .json({ message: "Vacate assigned students before deleting room" });
    }
    const result = await pool.query(
      "DELETE FROM hostel_rooms WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Room deleted" });
  } catch (error) {
    console.error("deleteRoom:", error);
    res.status(500).json({ message: "Failed to delete room" });
  }
};

const assignStudent = async (req, res) => {
  const {
    student_id,
    hostel_id,
    room_id,
    bed_id,
    hostel_fee,
    mess_fee,
    security_deposit = 0,
    join_date,
    guardian_contact,
    emergency_contact,
    notes,
  } = req.body;
  if (!student_id || !hostel_id || !room_id || !bed_id) {
    return res
      .status(400)
      .json({ message: "Student, hostel, room, and bed are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bed = await client.query(
      `SELECT b.*, r.monthly_fee, r.mess_fee, r.hostel_id
       FROM hostel_beds b
       JOIN hostel_rooms r ON r.id = b.room_id
       WHERE b.id = $1 AND b.room_id = $2 AND r.hostel_id = $3
       FOR UPDATE`,
      [bed_id, room_id, hostel_id],
    );
    if (!bed.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Selected bed was not found" });
    }

    const existing = await client.query(
      "SELECT * FROM student_hostel_allocations WHERE student_id = $1 FOR UPDATE",
      [student_id],
    );
    if (
      bed.rows[0].status === "Occupied" &&
      String(existing.rows[0]?.bed_id || "") !== String(bed_id)
    ) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Selected bed is already occupied" });
    }

    if (existing.rows.length && existing.rows[0].bed_id) {
      await client.query(
        "UPDATE hostel_beds SET status = 'Available', updated_at = NOW() WHERE id = $1",
        [existing.rows[0].bed_id],
      );
    }

    const fee =
      hostel_fee == null
        ? Number(bed.rows[0].monthly_fee || 0)
        : Number(hostel_fee);
    const mess =
      mess_fee == null ? Number(bed.rows[0].mess_fee || 0) : Number(mess_fee);

    const allocation = await client.query(
      `INSERT INTO student_hostel_allocations
         (student_id, hostel_id, room_id, bed_id, hostel_fee, mess_fee, security_deposit,
          join_date, leave_date, guardian_contact, emergency_contact, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,$10,$11,'Active')
       ON CONFLICT (student_id) DO UPDATE SET
         hostel_id = EXCLUDED.hostel_id,
         room_id = EXCLUDED.room_id,
         bed_id = EXCLUDED.bed_id,
         hostel_fee = EXCLUDED.hostel_fee,
         mess_fee = EXCLUDED.mess_fee,
         security_deposit = EXCLUDED.security_deposit,
         join_date = EXCLUDED.join_date,
         leave_date = NULL,
         guardian_contact = EXCLUDED.guardian_contact,
         emergency_contact = EXCLUDED.emergency_contact,
         notes = EXCLUDED.notes,
         status = 'Active',
         updated_at = NOW()
       RETURNING *`,
      [
        student_id,
        hostel_id,
        room_id,
        bed_id,
        fee,
        mess,
        Number(security_deposit || 0),
        join_date || new Date().toISOString().slice(0, 10),
        guardian_contact || null,
        emergency_contact || null,
        notes || null,
      ],
    );

    await client.query(
      "UPDATE hostel_beds SET status = 'Occupied', updated_at = NOW() WHERE id = $1",
      [bed_id],
    );
    await recalculateLatestFee(client, student_id, fee, mess);
    await client.query("COMMIT");
    res.json(allocation.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("assignStudentHostel:", error);
    res.status(500).json({ message: "Failed to assign hostel" });
  } finally {
    client.release();
  }
};

const vacateStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const allocation = await client.query(
      `UPDATE student_hostel_allocations
       SET status = 'Vacated', leave_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id],
    );
    if (!allocation.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Allocation not found" });
    }
    await client.query(
      "UPDATE hostel_beds SET status = 'Available', updated_at = NOW() WHERE id = $1",
      [allocation.rows[0].bed_id],
    );
    await recalculateLatestFee(client, allocation.rows[0].student_id, 0, 0);
    await client.query("COMMIT");
    res.json({ message: "Student vacated from hostel" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("vacateStudent:", error);
    res.status(500).json({ message: "Failed to vacate student" });
  } finally {
    client.release();
  }
};

const createLeaveRequest = async (req, res) => {
  const { allocation_id, student_id, from_date, to_date, reason } = req.body;
  if (!student_id || !from_date || !to_date) {
    return res
      .status(400)
      .json({ message: "Student, from date, and to date are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO hostel_leave_requests
         (allocation_id, student_id, from_date, to_date, reason)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [allocation_id || null, student_id, from_date, to_date, reason || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createLeaveRequest:", error);
    res.status(500).json({ message: "Failed to create leave request" });
  }
};

const updateLeaveStatus = async (req, res) => {
  const { status } = req.body;
  if (!["Pending", "Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid leave status" });
  }
  try {
    const result = await pool.query(
      `UPDATE hostel_leave_requests
       SET status = $1,
           approved_by = CASE WHEN $1 IN ('Approved', 'Rejected') THEN $2 ELSE approved_by END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, req.user.id, req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Leave request not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateLeaveStatus:", error);
    res.status(500).json({ message: "Failed to update leave request" });
  }
};

const createComplaint = async (req, res) => {
  const {
    allocation_id,
    student_id,
    category = "General",
    priority = "Medium",
    description,
    assigned_to,
  } = req.body;
  if (!student_id || !description) {
    return res
      .status(400)
      .json({ message: "Student and description are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO hostel_complaints
         (allocation_id, student_id, category, priority, description, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        allocation_id || null,
        student_id,
        category,
        priority,
        description,
        assigned_to || null,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createComplaint:", error);
    res.status(500).json({ message: "Failed to create complaint" });
  }
};

const updateComplaint = async (req, res) => {
  const { status, priority, assigned_to } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hostel_complaints SET
         status = COALESCE($1, status),
         priority = COALESCE($2, priority),
         assigned_to = $3,
         resolved_at = CASE WHEN $1 = 'Resolved' THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status || null, priority || null, assigned_to || null, req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Complaint not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateComplaint:", error);
    res.status(500).json({ message: "Failed to update complaint" });
  }
};

module.exports = {
  getHostelOverview,
  saveHostel,
  updateHostel,
  deleteHostel,
  saveRoom,
  updateRoom,
  deleteRoom,
  assignStudent,
  vacateStudent,
  createLeaveRequest,
  updateLeaveStatus,
  createComplaint,
  updateComplaint,
};
