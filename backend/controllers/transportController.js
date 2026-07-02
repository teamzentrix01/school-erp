const pool = require("../config/db");

const normalizeStops = (stops) => {
  if (!Array.isArray(stops)) return [];
  return stops.map((stop) => String(stop).trim()).filter(Boolean);
};

const getTransportOverview = async (_req, res) => {
  try {
    const [routes, vehicles, assignments, students] = await Promise.all([
      pool.query(`
        SELECT tr.*, tv.registration_number, tv.type AS vehicle_type,
               tv.capacity AS vehicle_capacity,
               COUNT(st.id)::int AS enrolled
        FROM transport_routes tr
        LEFT JOIN transport_vehicles tv ON tv.id = tr.vehicle_id
        LEFT JOIN student_transport st ON st.route_id = tr.id AND st.active = TRUE
        GROUP BY tr.id, tv.registration_number, tv.type, tv.capacity
        ORDER BY tr.route_code
      `),
      pool.query(
        "SELECT * FROM transport_vehicles ORDER BY registration_number",
      ),
      pool.query(`
        SELECT st.*, u.name AS student_name, u.email, s.roll_number,
               s.class, s.section, tr.route_code, tr.name AS route_name
        FROM student_transport st
        JOIN students s ON s.id = st.student_id
        JOIN users u ON u.id = s.user_id
        JOIN transport_routes tr ON tr.id = st.route_id
        ORDER BY u.name
      `),
      pool.query(`
        SELECT s.id, s.roll_number, s.class, s.section, u.name, u.email
        FROM students s
        JOIN users u ON u.id = s.user_id
        WHERE COALESCE(s.is_active, TRUE) = TRUE
        ORDER BY u.name
      `),
    ]);

    res.json({
      routes: routes.rows,
      vehicles: vehicles.rows,
      assignments: assignments.rows,
      students: students.rows,
    });
  } catch (error) {
    console.error("getTransportOverview:", error);
    res.status(500).json({ message: "Failed to load transport data" });
  }
};

const saveVehicle = async (req, res) => {
  const {
    registration_number,
    type = "Bus",
    model,
    capacity = 40,
    driver_name,
    driver_phone,
    conductor_name,
    status = "Active",
    last_service_date,
  } = req.body;
  if (!registration_number) {
    return res.status(400).json({ message: "Registration number is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transport_vehicles
         (registration_number, type, model, capacity, driver_name, driver_phone,
          conductor_name, status, last_service_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        registration_number.trim(),
        type,
        model || null,
        Number(capacity),
        driver_name || null,
        driver_phone || null,
        conductor_name || null,
        status,
        last_service_date || null,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Vehicle registration already exists" });
    }
    console.error("saveVehicle:", error);
    res.status(500).json({ message: "Failed to save vehicle" });
  }
};

const updateVehicle = async (req, res) => {
  const { id } = req.params;
  const {
    registration_number,
    type,
    model,
    capacity,
    driver_name,
    driver_phone,
    conductor_name,
    status,
    last_service_date,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE transport_vehicles SET
         registration_number = COALESCE($1, registration_number),
         type = COALESCE($2, type), model = $3,
         capacity = COALESCE($4, capacity), driver_name = $5,
         driver_phone = $6, conductor_name = $7,
         status = COALESCE($8, status), last_service_date = $9,
         updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [
        registration_number,
        type,
        model || null,
        capacity ? Number(capacity) : null,
        driver_name || null,
        driver_phone || null,
        conductor_name || null,
        status,
        last_service_date || null,
        id,
      ],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Vehicle not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateVehicle:", error);
    res.status(500).json({ message: "Failed to update vehicle" });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transport_vehicles WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Vehicle not found" });
    res.json({ message: "Vehicle deleted" });
  } catch (error) {
    console.error("deleteVehicle:", error);
    res.status(500).json({ message: "Failed to delete vehicle" });
  }
};

const saveRoute = async (req, res) => {
  const {
    route_code,
    name,
    area,
    stops,
    vehicle_id,
    departure_time,
    return_time,
    distance_km = 0,
    monthly_fee = 0,
    status = "Active",
  } = req.body;
  if (!route_code || !name) {
    return res
      .status(400)
      .json({ message: "Route code and name are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transport_routes
         (route_code, name, area, stops, vehicle_id, departure_time, return_time,
          distance_km, monthly_fee, status)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        route_code.trim(),
        name.trim(),
        area || null,
        JSON.stringify(normalizeStops(stops)),
        vehicle_id || null,
        departure_time || null,
        return_time || null,
        Number(distance_km || 0),
        Number(monthly_fee || 0),
        status,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Route code already exists" });
    }
    console.error("saveRoute:", error);
    res.status(500).json({ message: "Failed to save route" });
  }
};

const updateRoute = async (req, res) => {
  const {
    route_code,
    name,
    area,
    stops,
    vehicle_id,
    departure_time,
    return_time,
    distance_km,
    monthly_fee,
    status,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE transport_routes SET
         route_code = COALESCE($1, route_code), name = COALESCE($2, name),
         area = $3, stops = COALESCE($4::jsonb, stops), vehicle_id = $5,
         departure_time = $6, return_time = $7,
         distance_km = COALESCE($8, distance_km),
         monthly_fee = COALESCE($9, monthly_fee),
         status = COALESCE($10, status), updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [
        route_code,
        name,
        area || null,
        Array.isArray(stops) ? JSON.stringify(normalizeStops(stops)) : null,
        vehicle_id || null,
        departure_time || null,
        return_time || null,
        distance_km == null ? null : Number(distance_km),
        monthly_fee == null ? null : Number(monthly_fee),
        status,
        req.params.id,
      ],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Route not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateRoute:", error);
    res.status(500).json({ message: "Failed to update route" });
  }
};

const deleteRoute = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM transport_routes WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Route not found" });
    res.json({ message: "Route deleted" });
  } catch (error) {
    console.error("deleteRoute:", error);
    res.status(500).json({ message: "Failed to delete route" });
  }
};

const assignStudent = async (req, res) => {
  const {
    student_id,
    route_id,
    stop_name,
    pickup_time,
    drop_time,
    monthly_fee,
    active = true,
  } = req.body;
  if (!student_id || !route_id || !stop_name) {
    return res
      .status(400)
      .json({ message: "Student, route, and stop are required" });
  }

  try {
    const route = await pool.query(
      "SELECT monthly_fee FROM transport_routes WHERE id = $1",
      [route_id],
    );
    if (!route.rows.length)
      return res.status(404).json({ message: "Route not found" });
    const fee =
      monthly_fee == null
        ? Number(route.rows[0].monthly_fee || 0)
        : Number(monthly_fee);

    const result = await pool.query(
      `INSERT INTO student_transport
         (student_id, route_id, stop_name, pickup_time, drop_time, monthly_fee, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (student_id) DO UPDATE SET
         route_id = EXCLUDED.route_id, stop_name = EXCLUDED.stop_name,
         pickup_time = EXCLUDED.pickup_time, drop_time = EXCLUDED.drop_time,
         monthly_fee = EXCLUDED.monthly_fee, active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        student_id,
        route_id,
        stop_name,
        pickup_time || null,
        drop_time || null,
        fee,
        active,
      ],
    );

    await pool.query(
      `UPDATE student_fees
       SET transport_fee = $1,
           total_fees = tuition_fee + library_fee + other_fee + $1
                      + COALESCE(hostel_fee, 0) + COALESCE(mess_fee, 0),
           updated_at = NOW()
       WHERE student_id = $2
         AND academic_year = (
           SELECT academic_year FROM student_fees
           WHERE student_id = $2 ORDER BY created_at DESC LIMIT 1
         )`,
      [fee, student_id],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("assignStudent:", error);
    res.status(500).json({ message: "Failed to assign student" });
  }
};

const removeAssignment = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM student_transport WHERE id = $1 RETURNING student_id",
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Assignment not found" });
    await pool.query(
      `UPDATE student_fees SET transport_fee = 0,
       total_fees = tuition_fee + library_fee + other_fee
                  + COALESCE(hostel_fee, 0) + COALESCE(mess_fee, 0),
       updated_at = NOW()
       WHERE student_id = $1`,
      [result.rows[0].student_id],
    );
    res.json({ message: "Student removed from transport" });
  } catch (error) {
    console.error("removeAssignment:", error);
    res.status(500).json({ message: "Failed to remove assignment" });
  }
};

module.exports = {
  getTransportOverview,
  saveVehicle,
  updateVehicle,
  deleteVehicle,
  saveRoute,
  updateRoute,
  deleteRoute,
  assignStudent,
  removeAssignment,
};
