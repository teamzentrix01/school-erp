"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, Printer, RefreshCw } from "lucide-react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";

function groupResults(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.exam_id
      ? `exam-${row.exam_id}`
      : `legacy-${row.exam_type}-${row.exam_date}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        examName: row.exam_name || row.exam_type || "Result",
        academicYear: row.academic_year || "",
        marks: [],
      });
    }
    groups.get(key).marks.push(row);
  });
  return [...groups.values()];
}

function summaryFor(marks) {
  const obtained = marks.reduce(
    (sum, mark) => sum + Number(mark.marks_obtained || 0),
    0,
  );
  const total = marks.reduce(
    (sum, mark) => sum + Number(mark.total_marks || 0),
    0,
  );
  const percentage = total ? Number(((obtained / total) * 100).toFixed(2)) : 0;
  const passed =
    marks.length > 0 &&
    marks.every(
      (mark) =>
        mark.attendance_status === "Medical" ||
        (mark.attendance_status !== "Absent" &&
          Number(mark.total_marks) > 0 &&
          (Number(mark.marks_obtained) / Number(mark.total_marks)) * 100 >= 33),
    );
  return { obtained, total, percentage, status: passed ? "Pass" : "Fail" };
}

export default function StudentResultsPage() {
  const [rows, setRows] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/student/results");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exams = useMemo(() => groupResults(rows), [rows]);
  useEffect(() => {
    if (!selectedKey && exams.length) setSelectedKey(exams[0].key);
  }, [exams, selectedKey]);

  const selected =
    exams.find((exam) => exam.key === selectedKey) || exams[0] || null;
  const summary = selected ? summaryFor(selected.marks) : null;

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Results</h1>
              <p className="mt-1 text-sm text-gray-500">
                View published examinations and print your result summary.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-lg border border-orange-200 p-2.5 text-orange-700"
              title="Refresh results"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5 lg:p-8">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : exams.length ? (
            <>
              <section className="rounded-lg border border-orange-200 bg-white p-4">
                <label className="text-xs font-semibold text-gray-500">
                  Published examination
                  <select
                    className="mt-1.5 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                    value={selected?.key || ""}
                    onChange={(event) => setSelectedKey(event.target.value)}
                  >
                    {exams.map((exam) => (
                      <option key={exam.key} value={exam.key}>
                        {exam.examName}
                        {exam.academicYear ? ` - ${exam.academicYear}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section
                id="student-result-print"
                className="rounded-lg border border-orange-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 border-b border-orange-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-orange-600">
                      Published Result
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">
                      {selected.examName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {selected.academicYear || "Academic record"}
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="print:hidden flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Printer size={15} /> Print / Save PDF
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
                  {[
                    ["Obtained", summary.obtained],
                    ["Maximum", summary.total],
                    ["Percentage", `${summary.percentage}%`],
                    ["Result", summary.status],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-orange-100 bg-orange-50 p-3"
                    >
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="mt-1 text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-sm">
                    <thead className="bg-orange-50 text-xs text-gray-600">
                      <tr>
                        {[
                          "Subject",
                          "Attendance",
                          "Obtained",
                          "Maximum",
                          "Grade",
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
                      {selected.marks.map((mark) => (
                        <tr key={`${mark.id}-${mark.subject}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {mark.subject}
                          </td>
                          <td className="px-4 py-3">
                            {mark.attendance_status || "Present"}
                          </td>
                          <td className="px-4 py-3">
                            {mark.attendance_status === "Absent"
                              ? "AB"
                              : mark.attendance_status === "Medical"
                                ? "Medical"
                                : mark.marks_obtained}
                          </td>
                          <td className="px-4 py-3">{mark.total_marks}</td>
                          <td className="px-4 py-3 font-semibold">
                            {mark.grade || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {mark.remarks || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-orange-300 bg-white py-20 text-center">
              <Award size={32} className="mx-auto mb-3 text-orange-500" />
              <p className="font-semibold text-gray-800">
                No published results yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Approved results will appear here after admin publishes the
                exam.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
