const PDFDocument = require("pdfkit");
const pool = require("../config/db");

const TYPES = new Set(["character", "transfer"]);

function renderCertificate(doc, item) {
  const title = item.certificate_type === "transfer" ? "TRANSFER CERTIFICATE" : "CHARACTER CERTIFICATE";
  doc.rect(35, 35, 525, 772).lineWidth(2).stroke("#1e3a8a");
  doc.rect(42, 42, 511, 758).lineWidth(0.5).stroke("#1e3a8a");
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#1e3a8a").text(process.env.SCHOOL_NAME || "EduERP School", { align: "center" });
  doc.fontSize(10).fillColor("#4b5563").text(process.env.SCHOOL_ADDRESS || "School Administration", { align: "center" });
  doc.moveDown(2).fontSize(17).fillColor("#111827").text(title, { align: "center", underline: true });
  doc.moveDown().font("Helvetica").fontSize(10).text(`Certificate No: ${item.certificate_number}`, { align: "right" });
  doc.moveDown(2).fontSize(13).text(`This is to certify that ${item.student_name}, admission number ${item.admission_number || "-"}, roll number ${item.roll_number || "-"}, was a student of Class ${item.class || "-"}-${item.section || "-"} at this institution.`, { align: "justify", lineGap: 7 });
  if (item.certificate_type === "character") doc.moveDown().text(`During the period of study, the student's conduct and character were found to be ${item.conduct || "Good"}.`, { align: "justify", lineGap: 7 });
  else doc.moveDown().text(`The student is leaving the institution on ${item.leaving_date ? new Date(item.leaving_date).toLocaleDateString("en-IN") : "the approved date"}${item.destination_school ? ` to continue studies at ${item.destination_school}` : ""}. All applicable institutional clearances have been completed.`, { align: "justify", lineGap: 7 });
  if (item.remarks) doc.moveDown().text(`Remarks: ${item.remarks}`, { lineGap: 7 });
  doc.moveDown(4).text(`Date of Issue: ${new Date(item.issued_at).toLocaleDateString("en-IN")}`);
  doc.moveDown(5).font("Helvetica-Bold").text("Principal / Authorized Signatory", { align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text("This certificate was generated electronically by EduERP.", 55, 770, { align: "center", width: 485 });
  doc.end();
}

const certificateQuery = `SELECT cr.*,s.student_id AS admission_number,s.roll_number,s.class,s.section,
  s.date_of_birth,s.guardian_name,u.name AS student_name,u.email
  FROM certificate_requests cr JOIN students s ON s.id=cr.student_id JOIN users u ON u.id=s.user_id`;

async function getStudentByUser(userId) {
  const result = await pool.query("SELECT id FROM students WHERE user_id=$1", [userId]);
  return result.rows[0];
}

async function clearance(client, studentId) {
  const [fees, library, hostel] = await Promise.all([
    client.query("SELECT COALESCE(SUM(total_fees-paid_amount),0)::numeric AS due FROM student_fees WHERE student_id=$1", [studentId]),
    client.query("SELECT COUNT(*)::int AS count FROM library_issues WHERE student_id=$1 AND LOWER(status) NOT IN ('returned','closed')", [studentId]),
    client.query("SELECT COUNT(*)::int AS count FROM student_hostel_allocations WHERE student_id=$1 AND LOWER(status)='active'", [studentId]),
  ]);
  const result = { fees_clear: Number(fees.rows[0].due) <= 0, fee_due: Number(fees.rows[0].due), library_clear: library.rows[0].count === 0, library_open: library.rows[0].count, hostel_clear: hostel.rows[0].count === 0 };
  return { ...result, all_clear: result.fees_clear && result.library_clear && result.hostel_clear };
}

exports.createRequest = async (req, res) => {
  const { certificate_type, reason, destination_school, leaving_date } = req.body;
  if (!TYPES.has(certificate_type)) return res.status(400).json({ message: "Certificate type must be character or transfer" });
  try {
    const student = await getStudentByUser(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const duplicate = await pool.query("SELECT id FROM certificate_requests WHERE student_id=$1 AND certificate_type=$2 AND status='pending'", [student.id, certificate_type]);
    if (duplicate.rows.length) return res.status(409).json({ message: "A pending request already exists" });
    const result = await pool.query(`INSERT INTO certificate_requests(student_id,certificate_type,reason,destination_school,leaving_date) VALUES($1,$2,$3,$4,$5) RETURNING *`, [student.id, certificate_type, reason || null, destination_school || null, leaving_date || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) { console.error("createCertificateRequest:", error); res.status(500).json({ message: "Failed to submit certificate request" }); }
};

exports.getMyRequests = async (req, res) => {
  try {
    const result = await pool.query(`${certificateQuery} WHERE s.user_id=$1 ORDER BY cr.requested_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ message: "Failed to load certificate requests" }); }
};

exports.getRequests = async (_req, res) => {
  try {
    const result = await pool.query(`${certificateQuery} ORDER BY CASE cr.status WHEN 'pending' THEN 0 ELSE 1 END,cr.requested_at DESC`);
    const rows = await Promise.all(result.rows.map(async row => row.certificate_type === "transfer" ? { ...row, clearance: await clearance(pool, row.student_id) } : row));
    res.json(rows);
  } catch (error) { console.error("getCertificateRequests:", error); res.status(500).json({ message: "Failed to load certificate requests" }); }
};

exports.reviewRequest = async (req, res) => {
  const { status, conduct, remarks } = req.body;
  if (!new Set(["approved", "rejected"]).has(status)) return res.status(400).json({ message: "Status must be approved or rejected" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(`${certificateQuery} WHERE cr.id=$1 FOR UPDATE OF cr`, [req.params.id]);
    if (!found.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Request not found" }); }
    const request = found.rows[0];
    let checks = request.clearance || {};
    if (status === "approved" && request.certificate_type === "transfer") {
      checks = await clearance(client, request.student_id);
      if (!checks.all_clear) { await client.query("ROLLBACK"); return res.status(409).json({ message: "TC cannot be issued until fees, library, and hostel clearance are complete", clearance: checks }); }
    }
    const prefix = request.certificate_type === "transfer" ? "TC" : "CC";
    const number = status === "approved" ? `${prefix}-${new Date().getFullYear()}-${String(request.id).padStart(6, "0")}` : null;
    const updated = await client.query(`UPDATE certificate_requests SET status=$1,conduct=$2,remarks=$3,clearance=$4,certificate_number=$5,reviewed_by=$6,reviewed_at=NOW(),issued_at=CASE WHEN $1='approved' THEN NOW() END WHERE id=$7 RETURNING *`, [status, conduct || null, remarks || null, checks, number, req.user.id, request.id]);
    if (status === "approved" && request.certificate_type === "transfer") await client.query("UPDATE students SET is_active=FALSE,updated_at=NOW() WHERE id=$1", [request.student_id]);
    await client.query("COMMIT"); res.json(updated.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); console.error("reviewCertificateRequest:", error); res.status(500).json({ message: "Failed to review certificate request" }); } finally { client.release(); }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const params = [req.params.id];
    let owner = "";
    if (req.user.role === "student") { params.push(req.user.id); owner = " AND s.user_id=$2"; }
    const result = await pool.query(`${certificateQuery} WHERE cr.id=$1 AND cr.status='approved'${owner}`, params);
    if (!result.rows.length) return res.status(404).json({ message: "Issued certificate not found" });
    const item = result.rows[0];
    const title = item.certificate_type === "transfer" ? "TRANSFER CERTIFICATE" : "CHARACTER CERTIFICATE";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${item.certificate_number}.pdf`);
    const doc = new PDFDocument({ size: "A4", margin: 55, info: { Title: title } }); doc.pipe(res);
    renderCertificate(doc, item);
  } catch (error) { console.error("downloadCertificate:", error); if (!res.headersSent) res.status(500).json({ message: "Failed to generate certificate" }); }
};

exports.renderCertificate = renderCertificate;
