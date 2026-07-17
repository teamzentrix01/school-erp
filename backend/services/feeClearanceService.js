const pool = require("../config/db");

async function getExamClearance(examId, database = pool) {
  const examResult = await database.query("SELECT * FROM exams WHERE id = $1", [examId]);
  if (!examResult.rows.length) return null;
  const exam = examResult.rows[0];

  const params = [exam.id, exam.class, exam.academic_year];
  let sectionFilter = "";
  if (exam.section) {
    params.push(exam.section);
    sectionFilter = `AND LOWER(TRIM(s.section)) = LOWER(TRIM($${params.length}))`;
  }

  const result = await database.query(
    `SELECT
       s.id AS student_id, s.roll_number, s.class, s.section,
       u.name AS student_name, u.email,
       sf.id AS student_fee_id,
       COALESCE(sf.total_fees, 0)::numeric AS total_fees,
       COALESCE(sf.paid_amount, 0)::numeric AS paid_amount,
       sf.status AS fee_status,
       override_record.id AS override_id,
       override_record.reason AS override_reason,
       override_record.active AS override_active,
       override_record.created_at AS override_created_at,
       approver.name AS override_by_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN student_fees sf
       ON sf.student_id = s.id AND sf.academic_year = $3
     LEFT JOIN result_fee_overrides override_record
       ON override_record.exam_id = $1 AND override_record.student_id = s.id
     LEFT JOIN users approver ON approver.id = override_record.approved_by
     WHERE LOWER(TRIM(s.class)) = LOWER(TRIM($2))
       ${sectionFilter}
       AND COALESCE(s.is_active, TRUE) = TRUE
     ORDER BY NULLIF(REGEXP_REPLACE(COALESCE(s.roll_number, ''), '\\D', '', 'g'), '')::int NULLS LAST,
              u.name`,
    params,
  );

  const rows = result.rows.map((row) => {
    const totalFees = Number(row.total_fees || 0);
    const paidAmount = Number(row.paid_amount || 0);
    const configuredAmount = Number(exam.fee_required_amount || 0);
    const requiredAmount = !exam.fee_clearance_required
      ? 0
      : exam.fee_clearance_mode === "amount"
        ? configuredAmount
        : totalFees;
    const overridden = Boolean(row.override_id && row.override_active);
    const cleared =
      !exam.fee_clearance_required ||
      overridden ||
      (Boolean(row.student_fee_id) && paidAmount >= requiredAmount);
    const pendingAmount = Math.max(0, requiredAmount - paidAmount);
    let clearanceStatus = "Cleared";
    if (overridden) clearanceStatus = "Exempted";
    else if (!cleared && !row.student_fee_id) clearanceStatus = "No Fee Record";
    else if (!cleared && paidAmount > 0) clearanceStatus = "Partially Paid";
    else if (!cleared) clearanceStatus = "Pending";

    return {
      ...row,
      total_fees: totalFees,
      paid_amount: paidAmount,
      required_amount: requiredAmount,
      pending_amount: pendingAmount,
      clearance_status: clearanceStatus,
      result_eligible: cleared,
      overridden,
    };
  });

  const summary = rows.reduce(
    (value, row) => {
      value.total += 1;
      value[row.result_eligible ? "eligible" : "blocked"] += 1;
      value.pending_amount += row.result_eligible ? 0 : row.pending_amount;
      if (row.overridden) value.overrides += 1;
      return value;
    },
    { total: 0, eligible: 0, blocked: 0, overrides: 0, pending_amount: 0 },
  );

  return { exam, rows, summary };
}

async function isStudentEligibleForExam(studentId, examId, database = pool) {
  const clearance = await getExamClearance(examId, database);
  if (!clearance) return null;
  const row = clearance.rows.find((item) => Number(item.student_id) === Number(studentId));
  return row ? { exam: clearance.exam, ...row } : null;
}

module.exports = { getExamClearance, isStudentEligibleForExam };
