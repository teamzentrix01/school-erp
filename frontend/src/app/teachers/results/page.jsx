"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Upload,
} from "lucide-react";
import TeacherSidebar from "@/components/TeacherSidebar";
import { apiFetch } from "@/lib/api";

const statusStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  returned: "bg-red-50 text-red-700 border-red-200",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function TeacherResultsPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [examData, setExamData] = useState(null);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const selected = useMemo(
    () =>
      assignments.find(
        (item) =>
          `${item.id}:${item.subject}:${item.assigned_section}` === selectedKey,
      ) || null,
    [assignments, selectedKey],
  );

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/teacher/result-exams");
      setAssignments(Array.isArray(data) ? data : []);
      setSelectedKey((current) => {
        if (current || !data?.length) return current;
        const first = data[0];
        return `${first.id}:${first.subject}:${first.assigned_section}`;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMarks = useCallback(async () => {
    if (!selected) {
      setExamData(null);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams({
        subject: selected.subject,
        section: selected.assigned_section,
      });
      const data = await apiFetch(
        `/teacher/result-exams/${selected.id}/marks?${query}`,
      );
      setExamData(data);
      setEntries(
        Object.fromEntries(
          (data.rows || []).map((row) => [
            row.student_id,
            {
              marks_obtained: row.marks_obtained ?? "",
              total_marks:
                row.total_marks ?? data.exam.default_total_marks ?? 100,
              attendance_status: row.attendance_status || "Present",
              remarks: row.remarks || "",
            },
          ]),
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  const updateEntry = (studentId, key, value) => {
    setEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [key]: value },
    }));
  };

  const payload = () =>
    (examData?.rows || []).map((student) => ({
      student_id: student.student_id,
      ...entries[student.student_id],
    }));

  const saveDraft = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await apiFetch(
        `/teacher/result-exams/${selected.id}/marks`,
        {
          method: "PUT",
          body: JSON.stringify({
            subject: selected.subject,
            section: selected.assigned_section,
            marks: payload(),
          }),
        },
      );
      await loadMarks();
      await loadAssignments();
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiFetch(`/teacher/result-exams/${selected.id}/marks`, {
        method: "PUT",
        body: JSON.stringify({
          subject: selected.subject,
          section: selected.assigned_section,
          marks: payload(),
        }),
      });
      await apiFetch(`/teacher/result-exams/${selected.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          subject: selected.subject,
          section: selected.assigned_section,
        }),
      });
      await loadMarks();
      await loadAssignments();
      setMessage("Marks submitted to admin for review.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    if (!examData?.rows?.length) return;
    const lines = [
      [
        "roll_number",
        "student_name",
        "marks_obtained",
        "total_marks",
        "attendance_status",
        "remarks",
      ]
        .map(csvCell)
        .join(","),
      ...examData.rows.map((student) => {
        const entry = entries[student.student_id] || {};
        return [
          student.roll_number,
          student.student_name,
          entry.marks_obtained,
          entry.total_marks,
          entry.attendance_status,
          entry.remarks,
        ]
          .map(csvCell)
          .join(",");
      }),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.name}-${selected.class}-${selected.assigned_section}-${selected.subject}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file) => {
    if (!file || !examData) return;
    setError("");
    setMessage("");
    try {
      const parsed = parseCsv(await file.text());
      const headers = (parsed.shift() || []).map((item) =>
        item.toLowerCase().trim(),
      );
      const rollIndex = headers.indexOf("roll_number");
      const marksIndex = headers.indexOf("marks_obtained");
      if (rollIndex < 0 || marksIndex < 0) {
        throw new Error(
          "CSV must contain roll_number and marks_obtained columns.",
        );
      }
      const byRoll = new Map(
        examData.rows.map((student) => [
          String(student.roll_number).trim(),
          student.student_id,
        ]),
      );
      let imported = 0;
      setEntries((current) => {
        const next = { ...current };
        parsed.forEach((columns) => {
          const studentId = byRoll.get(String(columns[rollIndex] || "").trim());
          if (!studentId) return;
          const read = (name, fallback) => {
            const index = headers.indexOf(name);
            return index >= 0 && columns[index] !== undefined
              ? columns[index]
              : fallback;
          };
          const status = read(
            "attendance_status",
            next[studentId]?.attendance_status || "Present",
          );
          next[studentId] = {
            ...next[studentId],
            marks_obtained: columns[marksIndex] ?? "",
            total_marks: read(
              "total_marks",
              next[studentId]?.total_marks ||
                examData.exam.default_total_marks ||
                100,
            ),
            attendance_status: ["Present", "Absent", "Medical"].includes(status)
              ? status
              : "Present",
            remarks: read("remarks", next[studentId]?.remarks || ""),
          };
          imported += 1;
        });
        return next;
      });
      setMessage(`${imported} student rows imported. Save draft to confirm.`);
    } catch (err) {
      setError(err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submissionStatus = examData?.submission?.status || "draft";
  const locked = ["submitted", "approved"].includes(submissionStatus);
  const completed = (examData?.rows || []).filter((student) => {
    const entry = entries[student.student_id];
    return (
      entry?.attendance_status !== "Present" ||
      (entry?.marks_obtained !== "" && entry?.marks_obtained != null)
    );
  }).length;

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Results Entry</h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter class marks, save drafts, and submit them for approval.
              </p>
            </div>
            <button
              onClick={loadAssignments}
              className="rounded-lg border border-orange-200 p-2.5 text-orange-700"
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5 lg:p-8">
          <section className="rounded-lg border border-orange-200 bg-white p-4">
            <label className="block text-xs font-semibold text-gray-500">
              Assigned exam, class and subject
              <select
                className="mt-1.5 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
              >
                <option value="">Select assignment</option>
                {assignments.map((item) => {
                  const key = `${item.id}:${item.subject}:${item.assigned_section}`;
                  return (
                    <option key={key} value={key}>
                      {item.name} | {item.class}-{item.assigned_section} |{" "}
                      {item.subject}
                    </option>
                  );
                })}
              </select>
            </label>
          </section>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {message && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              {message}
            </div>
          )}

          {examData && (
            <>
              <section className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-gray-900">
                      {examData.exam.name}: {examData.subject}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[submissionStatus]}`}
                    >
                      {submissionStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {completed}/{examData.rows.length} students completed
                  </p>
                  {examData.submission?.feedback && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Admin feedback: {examData.submission.feedback}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-gray-700"
                  >
                    <Download size={15} /> CSV Template
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={locked}
                    className="flex items-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                  >
                    <Upload size={15} /> Import CSV
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => importCsv(event.target.files?.[0])}
                  />
                </div>
              </section>

              <section className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      {[
                        "Roll No.",
                        "Student",
                        "Attendance",
                        "Marks",
                        "Total",
                        "Remarks",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left font-semibold"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {examData.rows.map((student) => {
                      const entry = entries[student.student_id] || {};
                      const notPresent = entry.attendance_status !== "Present";
                      return (
                        <tr key={student.student_id}>
                          <td className="px-4 py-3 text-gray-500">
                            {student.roll_number || "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {student.student_name}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              disabled={locked}
                              className="w-28 rounded-lg border border-orange-200 px-2 py-1.5 disabled:opacity-60"
                              value={entry.attendance_status || "Present"}
                              onChange={(event) =>
                                updateEntry(
                                  student.student_id,
                                  "attendance_status",
                                  event.target.value,
                                )
                              }
                            >
                              <option>Present</option>
                              <option>Absent</option>
                              <option>Medical</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              disabled={locked || notPresent}
                              className="w-24 rounded-lg border border-orange-200 px-2 py-1.5 disabled:bg-orange-50"
                              value={
                                notPresent ? "" : (entry.marks_obtained ?? "")
                              }
                              onChange={(event) =>
                                updateEntry(
                                  student.student_id,
                                  "marks_obtained",
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              disabled={locked}
                              className="w-24 rounded-lg border border-orange-200 px-2 py-1.5 disabled:bg-orange-50"
                              value={entry.total_marks ?? ""}
                              onChange={(event) =>
                                updateEntry(
                                  student.student_id,
                                  "total_marks",
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              disabled={locked}
                              className="w-full min-w-56 rounded-lg border border-orange-200 px-2 py-1.5 disabled:bg-orange-50"
                              value={entry.remarks ?? ""}
                              onChange={(event) =>
                                updateEntry(
                                  student.student_id,
                                  "remarks",
                                  event.target.value,
                                )
                              }
                              placeholder="Optional"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!examData.rows.length && (
                  <div className="py-16 text-center text-sm text-gray-500">
                    No active students found in this class.
                  </div>
                )}
              </section>

              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <button
                  onClick={saveDraft}
                  disabled={saving || locked || !examData.rows.length}
                  className="flex items-center justify-center gap-2 rounded-lg border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-800 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  Save Draft
                </button>
                <button
                  onClick={submit}
                  disabled={
                    saving ||
                    locked ||
                    completed !== examData.rows.length ||
                    !examData.rows.length
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Send size={15} /> Submit for Review
                </button>
              </div>
            </>
          )}

          {!loading && !assignments.length && (
            <div className="rounded-lg border border-dashed border-orange-300 bg-white py-20 text-center">
              <FileSpreadsheet
                size={30}
                className="mx-auto mb-3 text-orange-500"
              />
              <p className="font-semibold text-gray-800">
                No result assignments available
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Ask admin to create an exam for your assigned class and subject.
              </p>
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
