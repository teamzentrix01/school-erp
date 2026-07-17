"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Award,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function currentAcademicYear() {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function getToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/(^| )token=([^;]+)/)?.[2] || "";
}

async function apiFetch(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}/api/admin/results${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(!isForm && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function ExamModal({ classes, initial = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    exam_type: initial?.exam_type || "Unit Test",
    academic_year: initial?.academic_year || currentAcademicYear(),
    class: initial?.class || "",
    section: initial?.section || "",
    start_date: initial?.start_date?.slice(0, 10) || "",
    end_date: initial?.end_date?.slice(0, 10) || "",
    default_total_marks: initial?.default_total_marks || 100,
    fee_clearance_required: initial?.fee_clearance_required ?? true,
    fee_clearance_mode: initial?.fee_clearance_mode || "full",
    fee_required_amount: initial?.fee_required_amount || "",
    fee_clearance_cutoff_date:
      initial?.fee_clearance_cutoff_date?.slice(0, 10) || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputClass =
    "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await apiFetch(initial ? `/exams/${initial.id}` : "/exams", {
        method: initial ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto bg-white rounded-lg shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">
              {initial ? "Edit Exam" : "Create Exam"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Marks remain draft until you publish the exam.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-xs font-semibold text-gray-500">
            Exam name
            <input
              className={`${inputClass} mt-1.5`}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Term 1 Examination"
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Exam type
            <select
              className={`${inputClass} mt-1.5`}
              value={form.exam_type}
              onChange={(e) => set("exam_type", e.target.value)}
            >
              <option>Unit Test</option>
              <option>Midterm</option>
              <option>Final</option>
              <option>Practical</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Academic year
            <input
              className={`${inputClass} mt-1.5`}
              value={form.academic_year}
              onChange={(e) => set("academic_year", e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Class
            <select
              className={`${inputClass} mt-1.5`}
              value={form.class}
              onChange={(e) => set("class", e.target.value)}
            >
              <option value="">Select class</option>
              {[
                ...new Set(
                  classes.map((item) => item.grade || item.class_name),
                ),
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Section
            <select
              className={`${inputClass} mt-1.5`}
              value={form.section}
              onChange={(e) => set("section", e.target.value)}
            >
              <option value="">All sections</option>
              {classes
                .filter(
                  (item) =>
                    !form.class ||
                    (item.grade || item.class_name) === form.class,
                )
                .map((item) => (
                  <option key={item.id} value={item.section}>
                    {item.section}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Start date
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              className={`${inputClass} mt-1.5`}
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            End date
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              className={`${inputClass} mt-1.5`}
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Default total marks
            <input
              type="number"
              min="1"
              className={`${inputClass} mt-1.5`}
              value={form.default_total_marks}
              onChange={(e) => set("default_total_marks", e.target.value)}
            />
          </label>
          <label className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.fee_clearance_required}
              onChange={(e) => set("fee_clearance_required", e.target.checked)}
            />
            <span>
              <strong className="block text-gray-800">Require fee clearance to view result</strong>
              <span className="text-xs text-gray-500">
                Marks remain saved, but students with pending dues see a locked result.
              </span>
            </span>
          </label>
          {form.fee_clearance_required && (
            <>
              <label className="text-xs font-semibold text-gray-500">
                Clearance requirement
                <select
                  className={`${inputClass} mt-1.5`}
                  value={form.fee_clearance_mode}
                  onChange={(e) => set("fee_clearance_mode", e.target.value)}
                >
                  <option value="full">Full academic-year fee</option>
                  <option value="amount">Minimum paid amount</option>
                </select>
              </label>
              {form.fee_clearance_mode === "amount" && (
                <label className="text-xs font-semibold text-gray-500">
                  Required paid amount (₹)
                  <input
                    type="number"
                    min="1"
                    className={`${inputClass} mt-1.5`}
                    value={form.fee_required_amount}
                    onChange={(e) => set("fee_required_amount", e.target.value)}
                  />
                </label>
              )}
              <label className="text-xs font-semibold text-gray-500">
                Fee clearance cut-off date
                <input
                  type="date"
                  className={`${inputClass} mt-1.5`}
                  value={form.fee_clearance_cutoff_date}
                  onChange={(e) => set("fee_clearance_cutoff_date", e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {error && (
          <p className="mx-5 mb-3 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </p>
        )}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : initial ? (
              <Pencil size={14} />
            ) : (
              <Plus size={14} />
            )}{" "}
            {initial ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExamsTab({ exams, classes, load, selectExam }) {
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const remove = async (id) => {
    if (!window.confirm("Delete this exam and its marks?")) return;
    await apiFetch(`/exams/${id}`, { method: "DELETE" });
    load();
  };
  const publish = async (id) => {
    if (
      !window.confirm(
        "Publish this exam? Students will be able to see its results.",
      )
    )
      return;
    try {
      const result = await apiFetch(`/exams/${id}/publish`, { method: "POST" });
      window.alert(result.message || "Exam published successfully.");
      load();
    } catch (error) {
      window.alert(error.message);
    }
  };
  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={15} />
          Create Exam
        </button>
      </div>
      <div className="bg-white border border-gray-100 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              {[
                "Exam",
                "Class",
                "Dates",
                "Marks Entered",
                "Status",
                "Actions",
              ].map((item) => (
                <th key={item} className="text-left px-4 py-3">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exams.map((exam) => (
              <tr key={exam.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{exam.name}</p>
                  <p className="text-xs text-gray-400">
                    {exam.exam_type} - {exam.academic_year}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-blue-600">
                    {exam.fee_clearance_required
                      ? exam.fee_clearance_mode === "amount"
                        ? `Result lock: ₹${Number(exam.fee_required_amount || 0).toLocaleString("en-IN")} required`
                        : "Result lock: full fee required"
                      : "Fee clearance not required"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {exam.class}
                  {exam.section ? `-${exam.section}` : ""}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {exam.start_date?.slice(0, 10) || "-"} to{" "}
                  {exam.end_date?.slice(0, 10) || "-"}
                </td>
                <td className="px-4 py-3">
                  {exam.marks_count} records / {exam.students_marked} students
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${exam.status === "published" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {exam.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectExam(exam)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg"
                    >
                      Enter Marks
                    </button>
                    <button
                      onClick={() => setEditingExam(exam)}
                      className="p-2 text-blue-600"
                      title="Edit exam"
                    >
                      <Pencil size={14} />
                    </button>
                    {exam.status !== "published" && (
                      <button
                        onClick={() => publish(exam.id)}
                        className="p-2 text-green-600"
                        title="Publish"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => remove(exam.id)}
                      className="p-2 text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!exams.length && (
          <div className="py-16 text-center text-sm text-gray-400">
            No exams created yet.
          </div>
        )}
      </div>
      {showModal && (
        <ExamModal
          classes={classes}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
      {editingExam && (
        <ExamModal
          classes={classes}
          initial={editingExam}
          onClose={() => setEditingExam(null)}
          onSaved={load}
        />
      )}
    </>
  );
}

function MarksTab({ exams, selectedExam, setSelectedExam }) {
  const [rows, setRows] = useState([]);
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadMarks = useCallback(async () => {
    if (!selectedExam) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/exams/${selectedExam.id}/marks`);
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }, [selectedExam]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  const students = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.student_id)) map.set(row.student_id, row);
    });
    return [...map.values()];
  }, [rows]);

  useEffect(() => {
    if (!subject) {
      setMarks({});
      return;
    }
    const next = {};
    students.forEach((student) => {
      const existing = rows.find(
        (row) =>
          row.student_id === student.student_id &&
          row.subject?.toLowerCase() === subject.toLowerCase(),
      );
      next[student.student_id] = {
        obtained: existing?.marks_obtained ?? "",
        total:
          existing?.total_marks ?? selectedExam?.default_total_marks ?? 100,
        remarks: existing?.remarks ?? "",
      };
    });
    setMarks(next);
  }, [subject, rows, students, selectedExam]);

  const save = async () => {
    if (!selectedExam || !subject.trim())
      return setMessage("Enter a subject first.");
    setSaving(true);
    setMessage("");
    try {
      await apiFetch(`/exams/${selectedExam.id}/marks`, {
        method: "PUT",
        body: JSON.stringify({
          marks: students.map((student) => ({
            student_id: student.student_id,
            subject: subject.trim(),
            marks_obtained: marks[student.student_id]?.obtained,
            total_marks: marks[student.student_id]?.total,
            remarks: marks[student.student_id]?.remarks,
          })),
        }),
      });
      setMessage("Marks saved successfully.");
      loadMarks();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <select
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          value={selectedExam?.id || ""}
          onChange={(e) =>
            setSelectedExam(
              exams.find((exam) => String(exam.id) === e.target.value) || null,
            )
          }
        >
          <option value="">Select exam</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} - {exam.class}
              {exam.section ? `-${exam.section}` : ""}
            </option>
          ))}
        </select>
        <input
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm flex-1"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject, e.g. Mathematics"
        />
        <button
          onClick={save}
          disabled={saving || !selectedExam}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save Marks
        </button>
      </div>
      {message && (
        <p className="text-sm px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
          {message}
        </p>
      )}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {[
                  "Student",
                  "Roll No.",
                  "Marks Obtained",
                  "Total Marks",
                  "Remarks",
                ].map((item) => (
                  <th key={item} className="text-left px-4 py-3">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td className="px-4 py-3 font-semibold">
                    {student.student_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {student.roll_number}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg"
                      value={marks[student.student_id]?.obtained ?? ""}
                      onChange={(e) =>
                        setMarks((current) => ({
                          ...current,
                          [student.student_id]: {
                            ...current[student.student_id],
                            obtained: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg"
                      value={marks[student.student_id]?.total ?? ""}
                      onChange={(e) =>
                        setMarks((current) => ({
                          ...current,
                          [student.student_id]: {
                            ...current[student.student_id],
                            total: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full min-w-52 px-2 py-1.5 border border-gray-200 rounded-lg"
                      value={marks[student.student_id]?.remarks ?? ""}
                      onChange={(e) =>
                        setMarks((current) => ({
                          ...current,
                          [student.student_id]: {
                            ...current[student.student_id],
                            remarks: e.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!selectedExam && (
            <div className="py-16 text-center text-sm text-gray-400">
              Select an exam to load students.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubmissions(await apiFetch("/submissions"));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (submission, action) => {
    if (action === "return" && !feedback[submission.id]?.trim()) {
      setMessage("Add feedback before returning marks.");
      return;
    }
    setBusyId(submission.id);
    setMessage("");
    try {
      await apiFetch(`/submissions/${submission.id}/review`, {
        method: "PUT",
        body: JSON.stringify({
          action,
          feedback: feedback[submission.id] || "",
        }),
      });
      setMessage(
        action === "approve" ? "Marks approved." : "Marks returned to teacher.",
      );
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const statusClass = {
    submitted: "bg-blue-50 text-blue-700",
    approved: "bg-green-50 text-green-700",
    returned: "bg-red-50 text-red-700",
    draft: "bg-amber-50 text-amber-700",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              {[
                "Exam",
                "Teacher",
                "Class / Subject",
                "Records",
                "Status",
                "Feedback / Actions",
              ].map((item) => (
                <th key={item} className="px-4 py-3 text-left">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">
                    {item.exam_name}
                  </p>
                  <p className="text-xs text-gray-400">{item.academic_year}</p>
                </td>
                <td className="px-4 py-3">{item.teacher_name}</td>
                <td className="px-4 py-3">
                  <p>
                    {item.class}-{item.section}
                  </p>
                  <p className="text-xs font-semibold text-blue-700">
                    {item.subject}
                  </p>
                </td>
                <td className="px-4 py-3">{item.marks_count} marks</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClass[item.status] || statusClass.draft}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.status === "submitted" ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="min-w-56 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                        value={feedback[item.id] || ""}
                        onChange={(event) =>
                          setFeedback((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="Feedback required only when returning"
                      />
                      <button
                        onClick={() => review(item, "approve")}
                        disabled={busyId === item.id}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        onClick={() => review(item, "return")}
                        disabled={busyId === item.id}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                      >
                        <Undo2 size={13} /> Return
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {item.feedback || "No feedback"}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!submissions.length && (
          <div className="py-16 text-center text-sm text-gray-400">
            No teacher submissions yet.
          </div>
        )}
      </div>
    </div>
  );
}

function FeeClearanceTab({ exams }) {
  const [examId, setExamId] = useState("");
  const [clearance, setClearance] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (id = examId) => {
    if (!id) {
      setClearance(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setClearance(await apiFetch(`/exams/${id}/fee-clearance`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId || !exams.length) return undefined;
    const timer = setTimeout(() => setExamId(String(exams[0].id)), 0);
    return () => clearTimeout(timer);
  }, [examId, exams]);

  useEffect(() => {
    if (!examId) return;
    const timer = setTimeout(() => load(examId), 0);
    return () => clearTimeout(timer);
  }, [examId, load]);

  const setOverride = async (student, allowed) => {
    let reason = "";
    if (allowed) {
      reason = window.prompt(
        `Reason for allowing ${student.student_name}'s result despite pending fees:`,
      )?.trim();
      if (!reason) return;
    } else if (!window.confirm(`Remove result override for ${student.student_name}?`)) {
      return;
    }
    try {
      setClearance(
        await apiFetch(
          `/exams/${examId}/fee-clearance/${student.student_id}/override`,
          {
            method: "PUT",
            body: JSON.stringify({ allowed, reason }),
          },
        ),
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const rows = (clearance?.rows || []).filter((row) => {
    if (filter === "eligible") return row.result_eligible;
    if (filter === "blocked") return !row.result_eligible;
    if (filter === "overrides") return row.overridden;
    return true;
  });
  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-gray-500">
          Examination
          <select
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            value={examId}
            onChange={(event) => setExamId(event.target.value)}
          >
            <option value="">Select exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} - {exam.class}{exam.section ? `-${exam.section}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-500">
          Status
          <select
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All students</option>
            <option value="eligible">Result eligible</option>
            <option value="blocked">Result blocked</option>
            <option value="overrides">Admin overrides</option>
          </select>
        </label>
        <button
          onClick={() => load()}
          disabled={!examId || loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {clearance && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Students", clearance.summary.total],
              ["Eligible", clearance.summary.eligible],
              ["Blocked", clearance.summary.blocked],
              ["Overrides", clearance.summary.overrides],
              ["Pending dues", money(clearance.summary.pending_amount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-100 bg-white p-4">
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  {["Student", "Class", "Required", "Paid", "Pending", "Clearance", "Admin action"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.student_id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{row.student_name}</p>
                      <p className="text-xs text-gray-400">Roll {row.roll_number || "-"}</p>
                    </td>
                    <td className="px-4 py-3">{row.class}-{row.section}</td>
                    <td className="px-4 py-3">{money(row.required_amount)}</td>
                    <td className="px-4 py-3 text-green-700">{money(row.paid_amount)}</td>
                    <td className="px-4 py-3 text-red-600">{money(row.pending_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.result_eligible ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {row.clearance_status}
                      </span>
                      {row.override_reason && (
                        <p className="mt-1 max-w-56 text-xs text-gray-400" title={row.override_reason}>
                          {row.override_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.overridden ? (
                        <button onClick={() => setOverride(row, false)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                          Remove override
                        </button>
                      ) : !row.result_eligible ? (
                        <button onClick={() => setOverride(row, true)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          Allow result
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Automatic</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-gray-400">No students match this filter.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function MarksheetTab({ exams }) {
  const [examId, setExamId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStudents = async (id) => {
    setExamId(id);
    setStudentId("");
    setSheet(null);
    if (!id) return setStudents([]);
    const data = await apiFetch(`/exams/${id}/marks`);
    const unique = new Map();
    data.rows.forEach((row) => unique.set(row.student_id, row));
    setStudents([...unique.values()]);
  };

  const loadSheet = async () => {
    if (!examId || !studentId) return;
    setLoading(true);
    try {
      setSheet(await apiFetch(`/marksheet/${examId}/${studentId}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <select
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          value={examId}
          onChange={(e) => loadStudents(e.target.value)}
        >
          <option value="">Select exam</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm flex-1"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">Select student</option>
          {students.map((student) => (
            <option key={student.student_id} value={student.student_id}>
              {student.student_name} - {student.roll_number}
            </option>
          ))}
        </select>
        <button
          onClick={loadSheet}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          Generate
        </button>
      </div>
      {loading && (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {sheet && (
        <div
          id="marksheet-print"
          className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto"
        >
          <div className="text-center border-b border-gray-200 pb-5">
            <h2 className="text-2xl font-bold text-gray-900">EduERP School</h2>
            <p className="text-sm text-gray-500 mt-1">
              {sheet.exam.name} Marksheet - {sheet.exam.academic_year}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5 text-sm">
            <div>
              <p className="text-gray-400">Student</p>
              <p className="font-semibold">{sheet.student.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Roll No.</p>
              <p className="font-semibold">{sheet.student.roll_number}</p>
            </div>
            <div>
              <p className="text-gray-400">Class</p>
              <p className="font-semibold">
                {sheet.student.class}-{sheet.student.section}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Result</p>
              <p className="font-semibold">{sheet.summary.status}</p>
            </div>
          </div>
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Subject</th>
                <th className="text-right p-3">Obtained</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sheet.marks.map((mark) => (
                <tr key={mark.subject}>
                  <td className="p-3">{mark.subject}</td>
                  <td className="p-3 text-right">{mark.marks_obtained}</td>
                  <td className="p-3 text-right">{mark.total_marks}</td>
                  <td className="p-3 text-right font-semibold">{mark.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex justify-end gap-6 text-sm">
            <p>
              Total:{" "}
              <strong>
                {sheet.summary.obtained}/{sheet.summary.total}
              </strong>
            </p>
            <p>
              Percentage: <strong>{sheet.summary.percentage}%</strong>
            </p>
            <p>
              Grade: <strong>{sheet.summary.grade}</strong>
            </p>
          </div>
          <div className="mt-6 flex justify-end print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <Printer size={15} />
              Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadsTab({ exams }) {
  const [uploads, setUploads] = useState([]);
  const [examId, setExamId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      apiFetch("/uploads")
        .then(setUploads)
        .catch(() => setUploads([])),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    if (!file) return setMessage("Choose a file.");
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      if (examId) body.append("exam_id", examId);
      const result = await apiFetch("/uploads", { method: "POST", body });
      setMessage(
        result.upload_kind === "marks_csv"
          ? `${result.rows_imported} marks rows imported.`
          : "Document uploaded.",
      );
      setFile(null);
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-lg p-5">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="text-xs font-semibold text-gray-500">
            Exam
            <select
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            >
              <option value="">General document</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">
            CSV, Excel, PDF or image
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
              className="mt-1.5 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            onClick={upload}
            disabled={uploading}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            Upload
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          CSV columns: roll_number, subject, marks_obtained, total_marks,
          remarks.
        </p>
        {message && <p className="text-sm text-blue-700 mt-3">{message}</p>}
      </div>
      <div className="bg-white border border-gray-100 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[650px]">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              {["File", "Exam", "Type", "Rows Imported", "Uploaded"].map(
                (item) => (
                  <th key={item} className="text-left px-4 py-3">
                    {item}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uploads.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <a
                    href={`${API_BASE}${item.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    {item.original_name}
                  </a>
                </td>
                <td className="px-4 py-3">{item.exam_name || "General"}</td>
                <td className="px-4 py-3">{item.upload_kind}</td>
                <td className="px-4 py-3">{item.rows_imported}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(item.created_at).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!uploads.length && (
          <div className="py-16 text-center text-sm text-gray-400">
            No result files uploaded.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const [tab, setTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [examData, classResponse] = await Promise.all([
        apiFetch("/exams"),
        fetch(`${API_BASE}/api/admin/classes`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then((response) => response.json()),
      ]);
      setExams(examData || []);
      setClasses(Array.isArray(classResponse) ? classResponse : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const published = exams.filter((exam) => exam.status === "published").length;
  const tabs = [
    ["exams", "Exams", Award],
    ["marks", "Marks Entry", BookOpen],
    ["reviews", "Teacher Reviews", ClipboardCheck],
    ["clearance", "Fee Clearance", ShieldCheck],
    ["marksheet", "Marksheet", FileText],
    ["uploads", "Uploads", FileSpreadsheet],
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-100 px-5 lg:px-8 py-5">
          <div className="pl-10 lg:pl-0 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Results and Marksheets
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Create exams, enter marks, publish results, and manage uploads.
              </p>
            </div>
            <button
              onClick={load}
              className="p-2.5 rounded-lg border border-gray-200 text-gray-500"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>
        <div className="p-5 lg:p-8 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Total Exams", exams.length],
              ["Published", published],
              ["Draft", exams.length - published],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white border border-gray-100 rounded-lg p-4"
              >
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500"}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          {error && (
            <p className="px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </p>
          )}
          {loading ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {tab === "exams" && (
                <ExamsTab
                  exams={exams}
                  classes={classes}
                  load={load}
                  selectExam={(exam) => {
                    setSelectedExam(exam);
                    setTab("marks");
                  }}
                />
              )}
              {tab === "marks" && (
                <MarksTab
                  exams={exams}
                  selectedExam={selectedExam}
                  setSelectedExam={setSelectedExam}
                />
              )}
              {tab === "reviews" && <ReviewsTab />}
              {tab === "clearance" && <FeeClearanceTab exams={exams} />}
              {tab === "marksheet" && <MarksheetTab exams={exams} />}
              {tab === "uploads" && <UploadsTab exams={exams} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
