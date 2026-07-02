"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { authHeaders } from "@/lib/auth";
import {
  Bell, ChevronDown, Search, Download, Plus, X, Save,
  Clock, BookOpen, UserCog, Trash2, Pencil, CalendarDays,
  AlertCircle, CheckCircle, Loader2, RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin`;

const DAYS    = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = Array.from({ length: 7 }, (_, i) => i + 1); // [1,2,3,4,5,6,7]

const SUBJECT_COLORS = {
  "Physics":        { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500"    },
  "Mathematics":    { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500"  },
  "Chemistry":      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  "Biology":        { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   dot: "bg-green-500"   },
  "English":        { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500"    },
  "History":        { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  "Computer Sc":    { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    dot: "bg-cyan-500"    },
  "Physical Ed":    { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500"  },
  "Hindi":          { bg: "bg-pink-50",    text: "text-pink-700",    border: "border-pink-200",    dot: "bg-pink-500"    },
  "Geography":      { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    dot: "bg-teal-500"    },
  "Statistics":     { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  dot: "bg-indigo-500"  },
  "Fine Arts":      { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-500" },
};
const DEFAULT_COLOR = { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };

const getColor = (subject) => SUBJECT_COLORS[subject] ?? DEFAULT_COLOR;

// ─────────────────────────────────────────────
// API HELPER
// ─────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API error");
  return data;
}

// ─────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  const styles = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  const Icon   = type === "success" ? CheckCircle : AlertCircle;
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${styles[type]}`}>
      <Icon size={16} />{message}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, accent, bg, sub, tooltipContent }) {
  const card = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}><Icon size={16} className={accent} /></div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
  if (tooltipContent && tooltipContent.length > 0) {
    return (
      <div className="relative group">
        {card}
        <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:block z-10 w-48">
          <p className="text-xs font-semibold text-gray-500 mb-1">All Teachers</p>
          {tooltipContent.map(t => (
            <div key={t.teacherId} className="flex justify-between text-xs py-0.5">
              <span className="truncate max-w-[120px]">{t.teacherName}</span>
              <span className="font-mono">{t.freeDays} free</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return card;
}

function PeriodCell({ entry, onEdit, onDelete }) {
  if (!entry) return <div className="h-full min-h-[72px] rounded-xl border-2 border-dashed border-gray-100 hover:border-blue-200 transition-colors" />;
  const col = getColor(entry.subject);
  return (
    <div className={`group relative h-full min-h-[72px] rounded-xl border ${col.border} ${col.bg} p-2.5 flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
          <span className={`text-xs font-bold leading-tight ${col.text}`}>{entry.subject}</span>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(entry); }}
            className="p-1 rounded-md hover:bg-white/70 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={11} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
            className="p-1 rounded-md hover:bg-white/70 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
        </div>
      </div>
      {entry.teacher_name && (
        <p className={`text-[10px] leading-tight ${col.text} opacity-70 truncate`}>
          {entry.teacher_name.split(" ").slice(-1)[0]}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD / EDIT PERIOD MODAL (with period_number)
// ─────────────────────────────────────────────

const EMPTY_FORM = { teacher_id: "", subject: "", day_of_week: "Monday", period_number: 1 };

function PeriodModal({ initial, onClose, onSave, teachers, classId }) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState(
    initial
      ? {
          teacher_id:    String(initial.teacher_id),
          subject:       initial.subject,
          day_of_week:   initial.day_of_week,
          period_number: Number(initial.period_number) || 1,
        }
      : {
          ...EMPTY_FORM,
          day_of_week:   initial?.day_of_week || "Monday",
          period_number: initial?.period_number ? Number(initial.period_number) : 1,
          teacher_id:    teachers[0] ? String(teachers[0].id) : "",
          subject:       teachers[0]?.subject || "",
        }
  );
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleTeacherChange(teacherId) {
    const teacher = teachers.find(t => String(t.id) === teacherId);
    setForm(prev => ({
      ...prev,
      teacher_id: teacherId,
      subject: teacher?.subject || prev.subject,
    }));
    setError("");
  }

  const selectedTeacher = teachers.find(t => String(t.id) === form.teacher_id);
const teacherSubjects = useMemo(() => {
  if (!selectedTeacher) return [];
  const assignments = selectedTeacher.subject_assignments || [];
  const subjects = assignments.map(a => a.subject).filter(Boolean);
  if (selectedTeacher.subject && !subjects.includes(selectedTeacher.subject))
    subjects.unshift(selectedTeacher.subject);
  
  // Duplicates remove karo
  return [...new Set(subjects)];
}, [selectedTeacher]);

  async function handleSave() {
    if (!form.teacher_id || !form.subject || !form.day_of_week || !form.period_number)
      return setError("All fields are required.");

    setLoading(true);
    setError("");
    try {
      await onSave({
        ...form,
        teacher_id:    parseInt(form.teacher_id, 10),
        period_number: parseInt(form.period_number, 10),
        class_id:      classId,
        id:            initial?.id,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selClass = "w-full appearance-none px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Period" : "Add Period"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? "Update the period details" : "Schedule a new class period"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Day */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Day</label>
            <div className="relative">
              <select
                value={form.day_of_week}
                onChange={e => { setForm(p => ({ ...p, day_of_week: e.target.value })); setError(""); }}
                className={selClass}
              >
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Period Number */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Period No.</label>
            <div className="relative">
              <select
                value={form.period_number}
                onChange={e => { setForm(p => ({ ...p, period_number: parseInt(e.target.value) })); setError(""); }}
                className={selClass}
              >
                {PERIODS.map(p => <option key={p} value={p}>Period {p}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Teacher */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Teacher</label>
            <div className="relative">
              <select value={form.teacher_id} onChange={e => handleTeacherChange(e.target.value)} className={selClass}>
                <option value="">Select teacher…</option>
                {teachers.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name} {t.subject ? `(${t.subject})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Subject</label>
            <div className="relative">
              {teacherSubjects.length > 0 ? (
                <>
                  <select value={form.subject} onChange={e => { setForm(p => ({ ...p, subject: e.target.value })); setError(""); }} className={selClass}>
                    <option value="">Select subject…</option>
                    {teacherSubjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </>
              ) : (
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => { setForm(p => ({ ...p, subject: e.target.value })); setError(""); }}
                  placeholder="Enter subject name"
                  className={selClass}
                />
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all hover:scale-[1.02]">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? "Update Period" : "Add Period"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function TimetablePage() {
  const [classes,   setClasses]   = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [timetable, setTimetable] = useState([]);

  const [activeClassId, setActiveClassId] = useState(null);
  const [viewMode,      setViewMode]      = useState("grid");
  const [modal,         setModal]         = useState(null);
  const [toast,         setToast]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [deleteConf,    setDeleteConf]    = useState(null);

  const [loadingClasses,   setLoadingClasses]   = useState(true);
  const [loadingTeachers,  setLoadingTeachers]  = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    Promise.resolve().then(() => apiFetch("/classes"))
      .then(data => {
        setClasses(data);
        if (data.length > 0) setActiveClassId(data[0].dbId);
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoadingClasses(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => apiFetch("/teachers"))
      .then(data => setTeachers(data))
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoadingTeachers(false));
  }, []);

  const fetchTimetable = useCallback(() => {
    if (!activeClassId) return;
    setLoadingTimetable(true);
    apiFetch(`/timetable?class_id=${activeClassId}`)
      .then(data => setTimetable(data))
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoadingTimetable(false));
  }, [activeClassId]);

  useEffect(() => {
    Promise.resolve().then(fetchTimetable);
  }, [fetchTimetable]);

  const teacherFreeDaysList = useMemo(() => {
    if (!timetable.length || !teachers.length) {
      return [];
    }

    const totalPossiblePeriods = DAYS.length * PERIODS.length; // 42
    const teacherPeriodCount = {};
    timetable.forEach(entry => {
      const tid = entry.teacher_id;
      teacherPeriodCount[tid] = (teacherPeriodCount[tid] || 0) + 1;
    });

    const freePeriodsData = teachers.map(teacher => {
      const assignedPeriods = teacherPeriodCount[teacher.id] || 0;
      const freePeriods = totalPossiblePeriods - assignedPeriods;
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        freeDays: freePeriods,
      };
    });

    return freePeriodsData;
  }, [timetable, teachers]);

  const teacherWithMostFreeDays = useMemo(() => {
    if (!teacherFreeDaysList.length) return null;
    return teacherFreeDaysList.reduce((max, curr) =>
      curr.freeDays > max.freeDays ? curr : max,
      teacherFreeDaysList[0]
    );
  }, [teacherFreeDaysList]);

  const activeClass = classes.find(c => c.dbId === activeClassId);
  const classLabel  = activeClass ? `${activeClass.grade}-${activeClass.section}` : "";

  const totalPeriods   = timetable.length;
  const uniqueSubjects = [...new Set(timetable.map(e => e.subject))].length;
  const uniqueTeachers = [...new Set(timetable.map(e => e.teacher_id))].length;

  // Build 2D grid: grid[day][periodNumber] = entry
  // Ensure period_number is converted to number for correct lookup.
  const grid = useMemo(() => {
    const map = {};
    DAYS.forEach(day => { map[day] = {}; });
    timetable.forEach(entry => {
      if (entry.day_of_week && entry.period_number !== undefined) {
        const periodNum = Number(entry.period_number);
        if (!isNaN(periodNum) && periodNum >= 1 && periodNum <= 7) {
          map[entry.day_of_week][periodNum] = entry;
        }
      }
    });
    return map;
  }, [timetable]);

  // List view (flat list with day and period)
  const listEntries = useMemo(() => {
    const q = search.toLowerCase();
    return timetable
      .filter(e =>
        e.subject.toLowerCase().includes(q) ||
        e.day_of_week.toLowerCase().includes(q) ||
        (e.teacher_name || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const dayDiff = DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week);
        if (dayDiff !== 0) return dayDiff;
        return (Number(a.period_number) || 0) - (Number(b.period_number) || 0);
      });
  }, [timetable, search]);

  async function handleSave(formData) {
    const normalizedPeriod = Number(formData.period_number);
    const classSlotConflict = timetable.find(entry =>
      entry.id !== formData.id &&
      entry.day_of_week === formData.day_of_week &&
      Number(entry.period_number) === normalizedPeriod
    );

    if (classSlotConflict) {
      throw new Error(`Period P${normalizedPeriod} is already assigned on ${formData.day_of_week}.`);
    }

    if (formData.id) {
      await apiFetch(`/timetable/${formData.id}`, {
        method: "PUT",
        body: JSON.stringify({
          teacher_id:    formData.teacher_id,
          subject:       formData.subject,
          day_of_week:   formData.day_of_week,
          period_number: formData.period_number,
        }),
      });
    } else {
      await apiFetch("/timetable", {
        method: "POST",
        body: JSON.stringify({
          class_id:      formData.class_id,
          teacher_id:    formData.teacher_id,
          subject:       formData.subject,
          day_of_week:   formData.day_of_week,
          period_number: formData.period_number,
        }),
      });
    }
    fetchTimetable();
    setModal(null);
    showToast(formData.id ? "Period updated successfully" : "Period added successfully");
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/timetable/${id}`, { method: "DELETE" });
      setTimetable(prev => prev.filter(e => e.id !== id));
      setDeleteConf(null);
      showToast("Period deleted", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  function handleExport() {
    const rows = [
      ["Class", "Day", "Period", "Subject", "Teacher"],
      ...listEntries.map(e => [classLabel, e.day_of_week, e.period_number, e.subject, e.teacher_name || ""]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `timetable-${classLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as CSV", "info");
  }

  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];

  const teacherOptions = teachers.map(t => ({
    id:                  t.dbId,
    name:                t.name,
    subject:             t.subject,
    subject_assignments: t.subjectAssignments || [],
  }));

  if (loadingClasses || loadingTeachers) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-medium">Loading timetable data…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100
                           flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-64 max-w-full ml-10 lg:ml-0">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Search subject, teacher…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchTimetable} title="Refresh"
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <RefreshCw size={16} className={loadingTimetable ? "animate-spin" : ""} />
            </button>
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
            </button>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">AP</div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">Admin</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 p-6 lg:p-8 space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Timetable</h1>
              <p className="text-sm text-gray-500 mt-0.5">42 slots (6 days × 7 periods) · {classes.length} classes</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white
                           text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Download size={15} /> Export
              </button>
              <button onClick={() => setModal({ mode: "add" })}
                disabled={!activeClassId}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                           text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.99]">
                <Plus size={15} /> Add Period
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Periods"   value={totalPeriods}   icon={CalendarDays} accent="text-blue-600"    bg="bg-blue-50"    sub={`out of 42 slots`}      />
            <SummaryCard label="Subjects"        value={uniqueSubjects} icon={BookOpen}     accent="text-violet-600"  bg="bg-violet-50"  sub="Unique subjects"       />
            <SummaryCard label="Teachers"        value={uniqueTeachers} icon={UserCog}      accent="text-emerald-600"  bg="bg-emerald-50"  sub="Assigned"              />
            <SummaryCard 
              label="Most Free Periods (Teacher)" 
              value={teacherWithMostFreeDays ? `${teacherWithMostFreeDays.freeDays} free` : "—"} 
              icon={Clock} 
              accent="text-amber-600" 
              bg="bg-amber-50" 
              sub={teacherWithMostFreeDays ? teacherWithMostFreeDays.teacherName : "No teachers"}
              tooltipContent={teacherFreeDaysList.length > 0 ? teacherFreeDaysList : null}
            />
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {classes.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">No classes found. Add classes first.</p>
              ) : (
                classes.map(cls => (
                  <button key={cls.dbId}
                    onClick={() => setActiveClassId(cls.dbId)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeClassId === cls.dbId
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {cls.grade}-{cls.section}
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center gap-3">
              {DAYS.includes(todayName) && (
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
                  Today: {todayName}
                </span>
              )}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {[["grid","Grid"],["list","List"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`px-3.5 py-2 text-xs font-semibold transition-all ${viewMode === mode ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadingTimetable ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm">Loading schedule…</p>
              </div>
            </div>
          ) : (
            <>
              {/* GRID VIEW - 42 cells (7 periods x 6 days) */}
              {viewMode === "grid" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/70">
                          <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 w-20">Period</th>
                          {DAYS.map(day => (
                            <th key={day} className={`px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider w-36 ${
                              day === todayName ? "text-blue-600 bg-blue-50/50" : "text-gray-400"
                            }`}>
                              {day === todayName ? `★ ${day}` : day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERIODS.map(period => (
                          <tr key={period} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-3 py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50/50 border-r border-gray-100">
                              P{period}
                            </td>
                            {DAYS.map(day => {
                              const entry = grid[day]?.[period]; // period is number, grid uses number keys
                              const isToday = day === todayName;
                              return (
                                <td key={`${day}-${period}`} className={`px-2 py-2 ${isToday ? "bg-blue-50/20" : ""}`}>
                                  <div
                                    onClick={() => {
                                      if (!entry) {
                                        setModal({ mode: "add", entry: { day_of_week: day, period_number: period } });
                                      }
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <PeriodCell
                                      entry={entry ?? null}
                                      onEdit={entry => setModal({ mode: "edit", entry })}
                                      onDelete={id => setDeleteConf(id)}
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                    <p className="text-xs text-gray-400">Click an empty cell to add · Hover a period to edit or delete</p>
                    <div className="flex gap-3 ml-auto flex-wrap">
                      {Object.entries(SUBJECT_COLORS).slice(0, 5).map(([subj, col]) => (
                        <div key={subj} className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <span className="text-xs text-gray-500">{subj}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LIST VIEW */}
              {viewMode === "list" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/70">
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Day</th>
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Period</th>
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Subject</th>
                          <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Teacher</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {listEntries.map(entry => {
                          const col = getColor(entry.subject);
                          const isToday = entry.day_of_week === todayName;
                          return (
                            <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors group ${isToday ? "bg-blue-50/20" : ""}`}>
                              <td className="px-5 py-3.5">
                                <span className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-gray-700"}`}>
                                  {isToday ? `★ ${entry.day_of_week}` : entry.day_of_week}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-xs font-mono text-gray-500">P{entry.period_number}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.bg} ${col.text} ${col.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />{entry.subject}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <UserCog size={11} className="text-blue-600" />
                                  </div>
                                  <span className="text-sm text-gray-700">{entry.teacher_name || "—"}</span>
                                </div>
                               </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setModal({ mode: "edit", entry })}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                                  <button onClick={() => setDeleteConf(entry.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                </div>
                               </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {listEntries.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <CalendarDays size={32} className="mb-3 opacity-40" />
                        <p className="text-sm font-medium">No periods scheduled for {classLabel}</p>
                        <button onClick={() => setModal({ mode: "add" })}
                          className="mt-3 text-xs text-blue-600 font-semibold hover:underline">
                          + Add first period
                        </button>
                      </div>
                    )}
                  </div>

                  {listEntries.length > 0 && (
                    <div className="px-5 py-3.5 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        <span className="font-semibold text-gray-600">{listEntries.length}</span> periods scheduled out of 42
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add / Edit Modal */}
      {modal && (
        <PeriodModal
          initial={modal.entry}
          onClose={() => setModal(null)}
          onSave={handleSave}
          teachers={teacherOptions}
          classId={activeClassId}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Delete Period?</h3>
              <p className="text-sm text-gray-500 mt-1">This will remove the period permanently.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConf(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConf)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-200 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
