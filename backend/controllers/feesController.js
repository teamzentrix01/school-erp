const pool = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const getStudentFeeRecord = async (userId) => {
  const studentRes = await pool.query(
    "SELECT id, class, section FROM students WHERE user_id = $1",
    [userId],
  );
  if (!studentRes.rows.length) throw new Error("Student not found");
  const studentId = studentRes.rows[0].id;

  const feeRes = await pool.query(
    `SELECT sf.*, 
            s.class, s.section,
            u.name AS student_name, u.email AS student_email
     FROM student_fees sf
     JOIN students s ON sf.student_id = s.id
     JOIN users u ON s.user_id = u.id
     WHERE sf.student_id = $1
     ORDER BY sf.created_at DESC LIMIT 1`,
    [studentId],
  );
  return { studentId, feeRecord: feeRes.rows[0] || null };
};

// ── GET /api/fees/student/fees ─────────────────────────────────────────────────
const getStudentFees = async (req, res) => {
  try {
    const { studentId, feeRecord } = await getStudentFeeRecord(req.user.id);
    if (!feeRecord) return res.json(null);

    const paymentsRes = await pool.query(
      `SELECT fp.*, u.name AS recorded_by_name
       FROM fee_payments fp
       LEFT JOIN users u ON fp.recorded_by = u.id
       WHERE fp.student_fee_id = $1
       ORDER BY fp.created_at DESC`,
      [feeRecord.id],
    );

    res.json({ ...feeRecord, payments: paymentsRes.rows });
  } catch (err) {
    console.error("getStudentFees error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/fees/payment/create-order ───────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    const { studentId, feeRecord } = await getStudentFeeRecord(req.user.id);
    if (!feeRecord)
      return res
        .status(404)
        .json({ message: "No fee record found. Contact admin." });

    const remaining =
      Number(feeRecord.total_fees || 0) - Number(feeRecord.paid_amount || 0);
    if (amount > remaining)
      return res
        .status(400)
        .json({ message: `Amount exceeds remaining balance of ₹${remaining}` });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `fee_${studentId}_${Date.now()}`,
      notes: { student_id: studentId, student_fee_id: feeRecord.id },
    });

    await pool.query(
      `INSERT INTO fee_payment_orders
         (razorpay_order_id, student_fee_id, student_id, amount, status)
       VALUES ($1, $2, $3, $4, 'created')
       ON CONFLICT (razorpay_order_id) DO NOTHING`,
      [order.id, feeRecord.id, studentId, amount],
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      student_name: req.user.name,
      student_email: req.user.email,
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

// ── POST /api/fees/payment/verify ─────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ message: "Invalid payment signature" });

    const orderRes = await pool.query(
      "SELECT * FROM fee_payment_orders WHERE razorpay_order_id = $1",
      [razorpay_order_id],
    );
    if (!orderRes.rows.length)
      return res.status(404).json({ message: "Order not found" });

    const order = orderRes.rows[0];

    await pool.query(
      `UPDATE fee_payment_orders
       SET status = 'paid', razorpay_payment_id = $1, updated_at = NOW()
       WHERE razorpay_order_id = $2`,
      [razorpay_payment_id, razorpay_order_id],
    );

    res.json({
      success: true,
      message: "Payment verified. Please upload your receipt.",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      amount: order.amount,
      student_fee_id: order.student_fee_id,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

// ── POST /api/fees/payment/upload-receipt ─────────────────────────────────────
const uploadReceipt = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, amount, note } = req.body;
    if (!req.file)
      return res.status(400).json({ message: "Receipt file is required" });

    const orderRes = await pool.query(
      `SELECT fpo.*, sf.student_id
       FROM fee_payment_orders fpo
       JOIN student_fees sf ON fpo.student_fee_id = sf.id
       JOIN students s ON sf.student_id = s.id
       WHERE fpo.razorpay_order_id = $1 AND s.user_id = $2`,
      [razorpay_order_id, req.user.id],
    );
    if (!orderRes.rows.length)
      return res
        .status(403)
        .json({ message: "Order not found or unauthorized" });

    const order = orderRes.rows[0];
    const receiptUrl = `/uploads/receipts/${req.file.filename}`;

    const paymentRes = await pool.query(
      `INSERT INTO fee_payments
         (student_fee_id, amount, paid_on, note, receipt_url,
          razorpay_order_id, razorpay_payment_id, status, recorded_by, payment_mode)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'pending_approval', NULL, 'online')
       RETURNING *`,
      [
        order.student_fee_id,
        amount || order.amount,
        note || null,
        receiptUrl,
        razorpay_order_id,
        razorpay_payment_id,
      ],
    );

    res.json({
      success: true,
      message: "Receipt uploaded. Awaiting admin approval.",
      payment: paymentRes.rows[0],
    });
  } catch (err) {
    console.error("uploadReceipt error:", err);
    res.status(500).json({ message: "Failed to upload receipt" });
  }
};

// ── GET /api/fees/admin/pending-approvals ─────────────────────────────────────
const getPendingApprovals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fp.*,
              u.name  AS student_name,
              u.email AS student_email,
              s.class, s.section,
              s.roll_number,
              sf.total_fees,
              sf.paid_amount AS already_paid
       FROM fee_payments fp
       JOIN student_fees sf ON fp.student_fee_id = sf.id
       JOIN students s ON sf.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE fp.status = 'pending_approval'
       ORDER BY fp.created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getPendingApprovals error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── PATCH /api/fees/admin/approve/:paymentId ──────────────────────────────────
const approvePayment = async (req, res) => {
  const { paymentId } = req.params;
  const { note } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payRes = await client.query(
      "SELECT * FROM fee_payments WHERE id = $1 FOR UPDATE",
      [paymentId],
    );
    if (!payRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment not found" });
    }
    const payment = payRes.rows[0];
    if (payment.status !== "pending_approval") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Payment already processed" });
    }

    await client.query(
      `UPDATE fee_payments
       SET status = 'approved', recorded_by = $1, note = COALESCE($2, note), updated_at = NOW()
       WHERE id = $3`,
      [req.user.id, note || null, paymentId],
    );

    const sfRes = await client.query(
      "SELECT * FROM student_fees WHERE id = $1 FOR UPDATE",
      [payment.student_fee_id],
    );
    const sf = sfRes.rows[0];
    const newPaid = Number(sf.paid_amount || 0) + Number(payment.amount);
    const newTotal = Number(sf.total_fees || 0);

    let newStatus;
    if (newPaid >= newTotal) newStatus = "Paid";
    else if (newPaid > 0) newStatus = "Partial";
    else newStatus = sf.status;

    await client.query(
      `UPDATE student_fees
       SET paid_amount = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newPaid, newStatus, sf.id],
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Payment approved",
      new_status: newStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("approvePayment error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ── PATCH /api/fees/admin/reject/:paymentId ───────────────────────────────────
const rejectPayment = async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `UPDATE fee_payments
       SET status = 'rejected', recorded_by = $1, note = $2, updated_at = NOW()
       WHERE id = $3 AND status = 'pending_approval'
       RETURNING *`,
      [req.user.id, reason || "Rejected by admin", paymentId],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ message: "Payment not found or already processed" });

    res.json({ success: true, message: "Payment rejected" });
  } catch (err) {
    console.error("rejectPayment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/fees/admin/cash-payment ─────────────────────────────────────────
const recordCashPayment = async (req, res) => {
  const { student_fee_id, amount, note } = req.body;
  if (!student_fee_id || !amount || Number(amount) <= 0)
    return res
      .status(400)
      .json({ message: "student_fee_id and amount are required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sfRes = await client.query(
      "SELECT * FROM student_fees WHERE id = $1 FOR UPDATE",
      [student_fee_id],
    );
    if (!sfRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Fee record not found" });
    }
    const sf = sfRes.rows[0];

    const remaining = Number(sf.total_fees || 0) - Number(sf.paid_amount || 0);
    if (Number(amount) > remaining) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: `Amount exceeds remaining balance of ₹${remaining}` });
    }

    const payRes = await client.query(
      `INSERT INTO fee_payments
         (student_fee_id, amount, paid_on, note, status, recorded_by, payment_mode)
       VALUES ($1, $2, NOW(), $3, 'approved', $4, 'cash')
       RETURNING *`,
      [student_fee_id, Number(amount), note || "Cash payment", req.user.id],
    );

    const newPaid = Number(sf.paid_amount || 0) + Number(amount);
    const newTotal = Number(sf.total_fees || 0);
    let newStatus;
    if (newPaid >= newTotal) newStatus = "Paid";
    else if (newPaid > 0) newStatus = "Partial";
    else newStatus = sf.status;

    await client.query(
      `UPDATE student_fees
       SET paid_amount = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newPaid, newStatus, sf.id],
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Cash payment recorded successfully",
      payment: payRes.rows[0],
      new_status: newStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("recordCashPayment error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ── GET /api/fees/students ─────────────────────────────────────────────────────
const getStudentFeesList = async (req, res) => {
  try {
    const { class: cls, section, academic_year, limit = 200 } = req.query;
    let query = `
      SELECT sf.*,
             u.name, u.email,
             s.roll_number AS roll_no, s.roll_number,
             s.section, s.class AS student_class
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1`;
    const params = [];

    if (cls) {
      params.push(cls);
      query += ` AND (sf.class = $${params.length} OR s.class = $${params.length})`;
    }
    if (section) {
      params.push(section);
      query += ` AND s.section = $${params.length}`;
    }
    if (academic_year) {
      params.push(academic_year);
      query += ` AND sf.academic_year = $${params.length}`;
    }
    if (req.user.role === "teacher") {
      const teacher = await pool.query(
        "SELECT id FROM teachers WHERE user_id=$1",
        [req.user.id],
      );
      if (!teacher.rows.length) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }
      params.push(teacher.rows[0].id);
      const teacherParam = params.length;
      query += ` AND EXISTS (
        SELECT 1
        FROM classes c
        WHERE (
          s.class_id = c.id
          OR (
            (s.class = c.grade OR s.class = c.class_name OR s.class = CONCAT('Class ', c.grade))
            AND s.section = c.section
          )
        )
        AND (
          c.teacher_id = $${teacherParam}
          OR EXISTS (
            SELECT 1 FROM teacher_subjects ts
            WHERE ts.teacher_id = $${teacherParam}
              AND (ts.class_name = c.class_name OR ts.class_name = c.grade)
              AND (ts.section IS NULL OR ts.section = '' OR ts.section = c.section)
          )
        )
      )`;
    }

    params.push(Number(limit));
    query += ` ORDER BY u.name ASC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error("getStudentFeesList error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── PATCH /api/fees/students/:id ──────────────────────────────────────────────
const updateStudentFee = async (req, res) => {
  const { id } = req.params;
  const { transport_fee } = req.body;
  try {
    const sf = await pool.query("SELECT * FROM student_fees WHERE id = $1", [
      id,
    ]);
    if (!sf.rows.length) return res.status(404).json({ message: "Not found" });
    const row = sf.rows[0];
    const newTotal =
      Number(row.tuition_fee || 0) +
      Number(row.library_fee || 0) +
      Number(row.other_fee || 0) +
      Number(transport_fee || 0) +
      Number(row.hostel_fee || 0) +
      Number(row.mess_fee || 0);

    const result = await pool.query(
      `UPDATE student_fees
       SET transport_fee = $1, total_fees = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [transport_fee, newTotal, id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateStudentFee error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/fees/structures ─────────────────────────────────────────────────
const setFeeStructure = async (req, res) => {
  const {
    class: cls,
    section,
    academic_year,
    tuition_fee,
    library_fee,
    other_fee,
    due_date,
  } = req.body;
  if (!cls || !tuition_fee)
    return res.status(400).json({ message: "class and tuition_fee required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ← total pehle define karo
    const total =
      Number(tuition_fee) + Number(library_fee || 0) + Number(other_fee || 0);
    await client.query(
      `INSERT INTO fee_structures 
     (class, section, academic_year, tuition_fee, library_fee, other_fee, due_date)
   VALUES ($1::varchar, $2::varchar, $3::varchar, $4::numeric, $5::numeric, $6::numeric, $7::date)
   ON CONFLICT (class, section, academic_year)
   DO UPDATE SET 
     tuition_fee = EXCLUDED.tuition_fee,
     library_fee = EXCLUDED.library_fee,
     other_fee   = EXCLUDED.other_fee,
     due_date    = EXCLUDED.due_date,
     updated_at  = NOW()`,
      [
        cls,
        section || null,
        academic_year || "2024-25",
        tuition_fee,
        library_fee || 0,
        other_fee || 0,
        due_date || null,
      ],
    );

    let studentQuery = "SELECT id FROM students WHERE class = $1";
    const params = [cls];
    if (section) {
      params.push(section);
      studentQuery += ` AND section = $${params.length}`;
    }
    const students = await client.query(studentQuery, params);

    // student_fees INSERT — alag query mein $3 conflict fix
    for (const student of students.rows) {
      const ay = academic_year || "2024-25";

      // Pehle existing record check karo
      const existing = await client.query(
        `SELECT paid_amount, status FROM student_fees 
     WHERE student_id = $1 AND academic_year = $2::varchar`,
        [student.id, ay],
      );

      const existingPaid = existing.rows[0]?.paid_amount || 0;
      const existingStatus = existing.rows[0]?.status || "Pending";

      await client.query(
        `INSERT INTO student_fees
       (student_id, class, academic_year, tuition_fee, library_fee, other_fee,
        total_fees, paid_amount, status, due_date)
     VALUES ($1::int, $2::varchar, $3::varchar, $4::numeric, $5::numeric, $6::numeric,
             $7::numeric, $8::numeric, $9::varchar, $10::date)
     ON CONFLICT (student_id, academic_year)
     DO UPDATE SET 
       tuition_fee = EXCLUDED.tuition_fee,
       library_fee = EXCLUDED.library_fee,
       other_fee   = EXCLUDED.other_fee,
       total_fees  = EXCLUDED.total_fees
                   + COALESCE(student_fees.transport_fee, 0)
                   + COALESCE(student_fees.hostel_fee, 0)
                   + COALESCE(student_fees.mess_fee, 0),
       due_date    = EXCLUDED.due_date,
       updated_at  = NOW()`,
        [
          student.id,
          cls,
          ay,
          tuition_fee,
          library_fee || 0,
          other_fee || 0,
          total,
          existingPaid,
          existingStatus,
          due_date || null,
        ],
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, students_updated: students.rows.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("setFeeStructure error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ── GET /api/fees/admin/all-payments ──────────────────────────────────────────
const getAllPayments = async (req, res) => {
  try {
    const { status, class: cls, limit = 100 } = req.query;
    let query = `
      SELECT fp.*,
             u.name AS student_name,
             s.class, s.section, s.roll_number,
             sf.total_fees, sf.paid_amount
      FROM fee_payments fp
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      JOIN students s ON sf.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND fp.status = $${params.length}`;
    }
    if (cls) {
      params.push(cls);
      query += ` AND s.class = $${params.length}`;
    }
    params.push(Number(limit));
    query += ` ORDER BY fp.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("getAllPayments error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/fees/stats ────────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const { academic_year = "2024-25", date_from, date_to } = req.query;
    const paymentParams = [];
    let paymentWhere = "WHERE fp.status = 'approved'";
    if (date_from) {
      paymentParams.push(date_from);
      paymentWhere += ` AND fp.paid_on::date >= $${paymentParams.length}::date`;
    }
    if (date_to) {
      paymentParams.push(date_to);
      paymentWhere += ` AND fp.paid_on::date <= $${paymentParams.length}::date`;
    }

    // Summary: counts + amounts
    const summary = await pool.query(
      `SELECT
         COUNT(*)                                                AS total_count,
         COUNT(*) FILTER (WHERE status = 'Paid')                AS paid_count,
         COUNT(*) FILTER (WHERE status = 'Pending')             AS pending_count,
         COUNT(*) FILTER (WHERE status = 'Partial')             AS partial_count,
         COUNT(*) FILTER (WHERE status = 'Overdue')             AS overdue_count,
         COALESCE(SUM(paid_amount), 0)                          AS total_collected,
         COALESCE(SUM(total_fees), 0)                           AS total_fees,
         COALESCE(SUM(total_fees - paid_amount), 0)             AS total_pending
       FROM student_fees
       WHERE academic_year = $1`,
      [academic_year],
    );

    // Monthly collection — last 6 months
    const monthly = await pool.query(
      `SELECT
         TO_CHAR(fp.paid_on, 'Mon YY')  AS month,
         TO_CHAR(fp.paid_on, 'YYYY-MM') AS month_key,
         COALESCE(SUM(fp.amount), 0)    AS collected
       FROM fee_payments fp
       ${paymentWhere}
       GROUP BY month, month_key
       ORDER BY month_key ASC`,
      paymentParams,
    );

    const turnover = await pool.query(
      `SELECT COALESCE(SUM(fp.amount), 0) AS turnover,
              COUNT(*)::int AS transactions,
              COALESCE(AVG(fp.amount), 0) AS average_payment
       FROM fee_payments fp
       ${paymentWhere}`,
      paymentParams,
    );

    const classWise = await pool.query(
      `SELECT s.class, s.section,
              COALESCE(SUM(fp.amount), 0) AS collected,
              COUNT(fp.id)::int AS transactions
       FROM fee_payments fp
       JOIN student_fees sf ON sf.id = fp.student_fee_id
       JOIN students s ON s.id = sf.student_id
       ${paymentWhere}
       GROUP BY s.class, s.section
       ORDER BY s.class, s.section`,
      paymentParams,
    );

    const paymentModes = await pool.query(
      `SELECT COALESCE(
                fp.payment_mode,
                CASE WHEN fp.razorpay_payment_id IS NOT NULL THEN 'online' ELSE 'cash' END
              ) AS mode,
              COALESCE(SUM(fp.amount), 0) AS amount,
              COUNT(*)::int AS transactions
       FROM fee_payments fp
       ${paymentWhere}
       GROUP BY mode
       ORDER BY amount DESC`,
      paymentParams,
    );

    const feeHeads = await pool.query(
      `SELECT COALESCE(SUM(tuition_fee), 0) AS tuition,
              COALESCE(SUM(library_fee), 0) AS library,
              COALESCE(SUM(transport_fee), 0) AS transport,
              COALESCE(SUM(hostel_fee), 0) AS hostel,
              COALESCE(SUM(mess_fee), 0) AS mess,
              COALESCE(SUM(other_fee), 0) AS other
       FROM student_fees
       WHERE academic_year = $1`,
      [academic_year],
    );

    res.json({
      data: {
        summary: summary.rows[0],
        turnover: turnover.rows[0],
        monthly: monthly.rows,
        class_wise: classWise.rows,
        payment_modes: paymentModes.rows,
        fee_heads: feeHeads.rows[0],
      },
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStudentFees,
  createOrder,
  verifyPayment,
  uploadReceipt,
  getPendingApprovals,
  approvePayment,
  rejectPayment,
  recordCashPayment,
  getStudentFeesList,
  updateStudentFee,
  setFeeStructure,
  getAllPayments,
  getStats,
};
