"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  Calendar,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

function Skeleton({ h = "h-16" }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

export default function TeacherHomeworkForm() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    class_id: "",
    section: "",
    due_date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  // New: homework-classes endpoint se data
  const [homeworkClasses, setHomeworkClasses] = useState([]); // [{class_id, grade, section, subject?}]
  const [sections, setSections] = useState([]);

  const [homeworkList, setHomeworkList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  // ── Fetch teacher's assignable classes (works for both types) ──
  useEffect(() => {
    apiFetch("/teacher/homework-classes")
      .then((data) => setHomeworkClasses(Array.isArray(data) ? data : []))
      .catch(() => setHomeworkClasses([]));
  }, []);

  // ── Derive unique grades for dropdown ──
  const uniqueGrades = [
    ...new Map(homeworkClasses.map((c) => [c.grade, c])).values(),
  ];

  // ── When class (grade) changes, derive sections ──
  useEffect(() => {
    if (!form.class_id) {
      setSections([]);
      return;
    }

    // form.class_id stores the selected class_id (numeric id)
    // Find which grade this class_id belongs to
    const selectedEntry = homeworkClasses.find(
      (c) => String(c.class_id) === String(form.class_id),
    );
    if (!selectedEntry) {
      setSections([]);
      return;
    }

    // Get all sections for this grade
    const secs = homeworkClasses
      .filter((c) => c.grade === selectedEntry.grade)
      .map((c) => c.section);

    setSections([...new Set(secs)]);

    setForm((f) => {
      const subject =
        selectedEntry.subject && !f.subject ? selectedEntry.subject : f.subject;
      if (f.section === "" && f.subject === subject) return f;
      return { ...f, section: "", subject };
    });
  }, [form.class_id, homeworkClasses]);

  // ── When section changes, update class_id to the exact match ──
  const handleSectionChange = (section) => {
    // Find the entry that matches both the currently selected grade AND the chosen section
    const currentEntry = homeworkClasses.find(
      (c) => String(c.class_id) === String(form.class_id),
    );
    if (!currentEntry) {
      setForm((f) => ({ ...f, section }));
      return;
    }

    const exactMatch = homeworkClasses.find(
      (c) => c.grade === currentEntry.grade && c.section === section,
    );
    if (exactMatch) {
      setForm((f) => ({
        ...f,
        section,
        class_id: String(exactMatch.class_id),
        // Auto-fill subject if available
        subject: exactMatch.subject || f.subject,
      }));
    } else {
      setForm((f) => ({ ...f, section }));
    }
  };

  // ── Handle grade/class selection ──
  const handleClassChange = (class_id) => {
    setForm((f) => ({ ...f, class_id, section: "", subject: "" }));
  };

  // ── Fetch existing homework ──
  const loadHomework = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/homework/teacher");
      setHomeworkList(Array.isArray(data) ? data : []);
    } catch {
      setListError("Failed to load homework list.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMsg(null);
    if (
      !form.title ||
      !form.subject ||
      !form.class_id ||
      !form.section ||
      !form.due_date
    ) {
      setFormMsg({ type: "error", text: "Please fill all required fields." });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/homework", {
        method: "POST",
        body: JSON.stringify({ ...form, class_id: Number(form.class_id) }),
      });
      setFormMsg({ type: "success", text: "Homework assigned successfully!" });
      setForm({
        title: "",
        description: "",
        subject: "",
        class_id: "",
        section: "",
        due_date: "",
      });
      loadHomework();
    } catch {
      setFormMsg({
        type: "error",
        text: "Failed to assign homework. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!confirm("Delete this homework?")) return;
    try {
      await apiFetch(`/homework/${id}`, { method: "DELETE" });
      setHomeworkList((prev) => prev.filter((h) => h.id !== id));
    } catch {
      alert("Failed to delete.");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  // ── Selected grade label for display ──
  const selectedEntry = homeworkClasses.find(
    (c) => String(c.class_id) === String(form.class_id),
  );

  return (
    <div className="space-y-6">
      {/* ── Assign Homework Form ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Plus size={15} className="text-emerald-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-sm">Assign Homework</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 5 — Questions 1–10"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition placeholder-gray-300"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mathematics"
              value={form.subject}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition placeholder-gray-300"
            />
          </div>

          {/* Class + Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.class_id}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition bg-white pr-8"
                >
                  <option value="">
                    {homeworkClasses.length === 0
                      ? "No classes assigned"
                      : "Select class"}
                  </option>
                  {uniqueGrades.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      Class {c.grade}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                />
              </div>
              {homeworkClasses.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No classes found. Contact admin to assign classes/subjects.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Section <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.section}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  disabled={!form.class_id || sections.length === 0}
                  className="w-full appearance-none px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition bg-white pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select section</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={form.due_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, due_date: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Additional instructions or details…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition placeholder-gray-300 resize-none"
            />
          </div>

          {/* Feedback */}
          {formMsg && (
            <div
              className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                formMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-600 border-red-200"
              }`}
            >
              {formMsg.type === "success" ? (
                <CheckCircle size={15} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={15} className="flex-shrink-0" />
              )}
              {formMsg.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Assigning…
              </>
            ) : (
              <>
                <Plus size={15} /> Assign Homework
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── My Assigned Homework List ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <BookOpen size={15} className="text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-sm">Assigned Homework</h2>
          {homeworkList.length > 0 && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
              {homeworkList.length}
            </span>
          )}
        </div>

        <div className="p-4">
          {listLoading ? (
            <div className="space-y-2">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : listError ? (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {listError}
              <button
                onClick={loadHomework}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          ) : homeworkList.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No homework assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homeworkList.map((hw) => {
                const isOverdue =
                  new Date(hw.due_date) < new Date() && hw.due_date;
                return (
                  <div
                    key={hw.id}
                    className="rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-200 overflow-hidden"
                  >
                    <div className="px-4 py-3.5 flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isOverdue ? "bg-red-100" : "bg-emerald-100"}`}
                      >
                        <BookOpen
                          size={14}
                          className={
                            isOverdue ? "text-red-600" : "text-emerald-600"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {hw.subject}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Class {hw.class_name || hw.class_id}-{hw.section}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {hw.title}
                        </p>
                        {hw.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {hw.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar size={11} className="text-gray-400" />
                          <p className="text-xs text-gray-400">
                            Due:{" "}
                            {new Date(hw.due_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(hw.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors"
                        title="Delete homework"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
