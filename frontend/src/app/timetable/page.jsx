"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { authHeaders } from "@/lib/auth";
import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin`;

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_SETTINGS = {
  working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  periods: [
    { number: 1, label: "P1", start: "08:00", end: "08:45", type: "class" },
    { number: 2, label: "P2", start: "08:50", end: "09:35", type: "class" },
    { number: 3, label: "P3", start: "09:40", end: "10:25", type: "class" },
    { number: 4, label: "P4", start: "10:45", end: "11:30", type: "class" },
    { number: 5, label: "P5", start: "11:35", end: "12:20", type: "class" },
    { number: 6, label: "P6", start: "12:25", end: "13:10", type: "class" },
    { number: 7, label: "P7", start: "13:15", end: "14:00", type: "class" },
  ],
};

const EVENT_COLORS = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

const SUBJECT_COLORS = {
  Physics: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  Mathematics: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  Chemistry: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  Biology: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  English: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  History: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  Hindi: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
};
const DEFAULT_COLOR = { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API error");
  return data;
}

function normalizeSettings(settings) {
  return {
    working_days: Array.isArray(settings?.working_days) && settings.working_days.length
      ? settings.working_days
      : DEFAULT_SETTINGS.working_days,
    periods: Array.isArray(settings?.periods) && settings.periods.length
      ? settings.periods.map((period, index) => ({
          number: Number(period.number || index + 1),
          label: period.label || `P${index + 1}`,
          start: String(period.start || "08:00").slice(0, 5),
          end: String(period.end || "08:45").slice(0, 5),
          type: period.type === "break" ? "break" : "class",
        }))
      : DEFAULT_SETTINGS.periods,
  };
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function sameMonth(date, monthDate) {
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
}

function eventStartValue(event) {
  return String(event.event_date || event.start_date || "").slice(0, 10);
}

function eventEndValue(event) {
  return String(event.end_date || event.event_date || event.start_date || "").slice(0, 10);
}

function getColor(subject) {
  return SUBJECT_COLORS[subject] ?? DEFAULT_COLOR;
}

function Toast({ message, type, onClose }) {
  const styles = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${styles[type] || styles.info}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, accent, bg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={16} className={accent} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function PeriodCell({ entry, period, onAdd, onEdit, onDelete }) {
  if (period.type === "break") {
    return (
      <div className="h-full min-h-[72px] rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs font-semibold text-amber-700 flex items-center justify-center">
        {period.label || "Break"}
      </div>
    );
  }

  if (!entry) {
    return (
      <button onClick={onAdd} className="w-full h-full min-h-[72px] rounded-xl border-2 border-dashed border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-xs text-gray-300">
        Add
      </button>
    );
  }

  const col = getColor(entry.subject);
  return (
    <div className={`group relative h-full min-h-[72px] rounded-xl border ${col.border} ${col.bg} p-2.5 flex flex-col gap-1`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
            <span className={`text-xs font-bold leading-tight ${col.text}`}>{entry.subject}</span>
          </div>
          <p className={`text-[10px] mt-2 leading-tight ${col.text} opacity-70 truncate`}>
            {entry.teacher_name || "Teacher"}
          </p>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(entry)} className="p-1 rounded-md hover:bg-white/70 text-gray-400 hover:text-blue-600"><Pencil size={11} /></button>
          <button onClick={() => onDelete(entry.id)} className="p-1 rounded-md hover:bg-white/70 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
        </div>
      </div>
    </div>
  );
}

function PeriodModal({ initial, onClose, onSave, teachers, classId, settings }) {
  const isEdit = !!initial?.id;
  const classPeriods = settings.periods.filter((period) => period.type !== "break");
  const [form, setForm] = useState(() => ({
    teacher_id: initial?.teacher_id ? String(initial.teacher_id) : teachers[0] ? String(teachers[0].id) : "",
    subject: initial?.subject || teachers[0]?.subject || "",
    day_of_week: initial?.day_of_week || settings.working_days[0] || "Monday",
    period_number: Number(initial?.period_number || classPeriods[0]?.number || 1),
  }));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTeacher = teachers.find((teacher) => String(teacher.id) === String(form.teacher_id));
  const teacherSubjects = useMemo(() => {
    if (!selectedTeacher) return [];
    const subjects = (selectedTeacher.subject_assignments || []).map((item) => item.subject).filter(Boolean);
    if (selectedTeacher.subject && !subjects.includes(selectedTeacher.subject)) subjects.unshift(selectedTeacher.subject);
    return [...new Set(subjects)];
  }, [selectedTeacher]);

  function handleTeacherChange(teacherId) {
    const teacher = teachers.find((item) => String(item.id) === String(teacherId));
    setForm((prev) => ({
      ...prev,
      teacher_id: teacherId,
      subject: teacher?.subject || prev.subject,
    }));
    setError("");
  }

  async function handleSubmit() {
    if (!form.teacher_id || !form.subject || !form.day_of_week || !form.period_number) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave({
        ...form,
        id: initial?.id,
        class_id: classId,
        teacher_id: Number(form.teacher_id),
        period_number: Number(form.period_number),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Period" : "Add Period"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Weekly schedule slot</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="field-label">Day</label>
            <select value={form.day_of_week} onChange={(event) => setForm((prev) => ({ ...prev, day_of_week: event.target.value }))} className={inputClass}>
              {settings.working_days.map((day) => <option key={day}>{day}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Period</label>
            <select value={form.period_number} onChange={(event) => setForm((prev) => ({ ...prev, period_number: Number(event.target.value) }))} className={inputClass}>
              {classPeriods.map((period) => (
                <option key={period.number} value={period.number}>
                  {period.label} ({period.start}-{period.end})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Teacher</label>
            <select value={form.teacher_id} onChange={(event) => handleTeacherChange(event.target.value)} className={inputClass}>
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name} {teacher.subject ? `(${teacher.subject})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Subject</label>
            {teacherSubjects.length ? (
              <select value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} className={inputClass}>
                <option value="">Select subject</option>
                {teacherSubjects.map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            ) : (
              <input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} className={inputClass} placeholder="Subject" />
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-blue-200">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onClose, onSave }) {
  const [draft, setDraft] = useState(() => normalizeSettings(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleDay(day) {
    setDraft((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((item) => item !== day)
        : DAY_OPTIONS.filter((item) => [...prev.working_days, day].includes(item)),
    }));
  }

  function updatePeriod(index, key, value) {
    setDraft((prev) => ({
      ...prev,
      periods: prev.periods.map((period, i) => i === index ? { ...period, [key]: key === "number" ? Number(value) : value } : period),
    }));
  }

  function addPeriod() {
    setDraft((prev) => {
      const nextNumber = Math.max(0, ...prev.periods.map((period) => Number(period.number) || 0)) + 1;
      return {
        ...prev,
        periods: [...prev.periods, { number: nextNumber, label: `P${nextNumber}`, start: "14:05", end: "14:50", type: "class" }],
      };
    });
  }

  function removePeriod(index) {
    setDraft((prev) => ({ ...prev, periods: prev.periods.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!draft.working_days.length) return setError("Select at least one working day.");
    if (!draft.periods.length) return setError("Add at least one period.");
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Timetable Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Admin can customize days, periods, timings, and breaks</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Working Days</h3>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => (
                <button key={day} onClick={() => toggleDay(day)} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${draft.working_days.includes(day) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                  {day}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">Periods & Breaks</h3>
              <button onClick={addPeriod} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">
                <Plus size={14} /> Add Period
              </button>
            </div>
            <div className="space-y-2">
              {draft.periods.map((period, index) => (
                <div key={`${period.number}-${index}`} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[70px_1fr_130px_130px_120px_auto]">
                  <input type="number" min="1" value={period.number} onChange={(event) => updatePeriod(index, "number", event.target.value)} className="field-input" />
                  <input value={period.label} onChange={(event) => updatePeriod(index, "label", event.target.value)} className="field-input" placeholder="Label" />
                  <input type="time" value={period.start} onChange={(event) => updatePeriod(index, "start", event.target.value)} className="field-input" />
                  <input type="time" value={period.end} onChange={(event) => updatePeriod(index, "end", event.target.value)} className="field-input" />
                  <select value={period.type} onChange={(event) => updatePeriod(index, "type", event.target.value)} className="field-input">
                    <option value="class">Class</option>
                    <option value="break">Break</option>
                  </select>
                  <button onClick={() => removePeriod(index)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function EventModal({ initial, scope, classes, activeClassId, onClose, onSave }) {
  const today = toDateInput(new Date());
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    event_type: initial?.event_type || "Event",
    scope: initial?.scope || scope,
    class_id: initial?.class_id ? String(initial.class_id) : "",
    event_date: eventStartValue(initial || {}) || today,
    start_date: eventStartValue(initial || {}) || today,
    end_date: eventEndValue(initial || {}) || today,
    color: initial?.color || "blue",
    description: initial?.description || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        id: initial?.id,
        class_id: form.class_id ? Number(form.class_id) : activeClassId || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Event" : "Add Event"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{form.scope === "monthly" ? "Monthly calendar item" : "Yearly academic planner item"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="field-label">Title</label>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="field-input" placeholder="Unit test, holiday, annual function" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Type</label>
              <select value={form.event_type} onChange={(event) => setForm((prev) => ({ ...prev, event_type: event.target.value }))} className="field-input">
                <option>Event</option>
                <option>Exam</option>
                <option>Holiday</option>
                <option>Assembly</option>
                <option>Special Class</option>
              </select>
            </div>
            <div>
              <label className="field-label">Class Scope</label>
              <select value={form.class_id} onChange={(event) => setForm((prev) => ({ ...prev, class_id: event.target.value }))} className="field-input">
                <option value="">All classes</option>
                {classes.map((cls) => <option key={cls.dbId} value={cls.dbId}>{cls.grade}-{cls.section}</option>)}
              </select>
            </div>
          </div>
          {form.scope === "monthly" ? (
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={form.event_date} onChange={(event) => setForm((prev) => ({ ...prev, event_date: event.target.value, start_date: event.target.value, end_date: event.target.value }))} className="field-input" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Start Date</label>
                <input type="date" value={form.start_date} onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))} className="field-input" />
              </div>
              <div>
                <label className="field-label">End Date</label>
                <input type="date" value={form.end_date} onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))} className="field-input" />
              </div>
            </div>
          )}
          <div>
            <label className="field-label">Color</label>
            <select value={form.color} onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} className="field-input">
              {Object.keys(EVENT_COLORS).map((color) => <option key={color}>{color}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="field-input min-h-24" placeholder="Optional notes" />
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TimetablePage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [mode, setMode] = useState("weekly");
  const [weeklyView, setWeeklyView] = useState("grid");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [periodModal, setPeriodModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eventModal, setEventModal] = useState(null);
  const [deletePeriodId, setDeletePeriodId] = useState(null);
  const [deleteEventId, setDeleteEventId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  const workingDays = settings.working_days;
  const classPeriods = settings.periods.filter((period) => period.type !== "break");
  const totalSlots = workingDays.length * classPeriods.length;
  const activeClass = classes.find((cls) => cls.dbId === activeClassId);
  const classLabel = activeClass ? `${activeClass.grade}-${activeClass.section}` : "All";
  const todayName = DAY_OPTIONS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchSettings = useCallback(async () => {
    const data = await apiFetch("/timetable-settings");
    setSettings(normalizeSettings(data));
  }, []);

  const fetchTimetable = useCallback(async () => {
    if (!activeClassId) return;
    setLoadingTimetable(true);
    try {
      const data = await apiFetch(`/timetable?class_id=${activeClassId}`);
      setTimetable(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingTimetable(false);
    }
  }, [activeClassId, showToast]);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await apiFetch(`/timetable-events?class_id=${activeClassId || ""}`);
      setEvents(data);
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [activeClassId, showToast]);

  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const [classData, teacherData, settingsData] = await Promise.all([
          apiFetch("/classes"),
          apiFetch("/teachers"),
          apiFetch("/timetable-settings").catch(() => DEFAULT_SETTINGS),
        ]);
        setClasses(classData);
        setTeachers(teacherData);
        setSettings(normalizeSettings(settingsData));
        if (classData.length) setActiveClassId(classData[0].dbId);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [showToast]);

  useEffect(() => {
    fetchTimetable();
    fetchEvents();
  }, [fetchTimetable, fetchEvents]);

  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.dbId,
    name: teacher.name,
    subject: teacher.subject,
    subject_assignments: teacher.subjectAssignments || [],
  }));

  const grid = useMemo(() => {
    const map = {};
    workingDays.forEach((day) => { map[day] = {}; });
    timetable.forEach((entry) => {
      const periodNumber = Number(entry.period_number);
      if (map[entry.day_of_week] && Number.isFinite(periodNumber)) {
        map[entry.day_of_week][periodNumber] = entry;
      }
    });
    return map;
  }, [timetable, workingDays]);

  const listEntries = useMemo(() => {
    const q = search.toLowerCase();
    return timetable
      .filter((entry) =>
        entry.subject.toLowerCase().includes(q) ||
        entry.day_of_week.toLowerCase().includes(q) ||
        (entry.teacher_name || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const dayDiff = workingDays.indexOf(a.day_of_week) - workingDays.indexOf(b.day_of_week);
        if (dayDiff !== 0) return dayDiff;
        return Number(a.period_number) - Number(b.period_number);
      });
  }, [timetable, search, workingDays]);

  const visibleEvents = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter((event) =>
      (!q || event.title.toLowerCase().includes(q) || event.event_type.toLowerCase().includes(q)) &&
      (event.class_id === null || Number(event.class_id) === Number(activeClassId))
    );
  }, [events, search, activeClassId]);

  const monthlyEvents = useMemo(() => visibleEvents.filter((event) => {
    if (event.scope !== "monthly") return false;
    const date = new Date(eventStartValue(event));
    return !Number.isNaN(date.getTime()) && sameMonth(date, monthDate);
  }), [visibleEvents, monthDate]);

  const yearlyEvents = useMemo(() => visibleEvents
    .filter((event) => event.scope === "yearly")
    .sort((a, b) => eventStartValue(a).localeCompare(eventStartValue(b))), [visibleEvents]);

  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [monthDate]);

  const totalPeriods = timetable.length;
  const uniqueSubjects = new Set(timetable.map((entry) => entry.subject)).size;
  const uniqueTeachers = new Set(timetable.map((entry) => entry.teacher_id)).size;
  const freeSlots = Math.max(totalSlots - totalPeriods, 0);

  async function handleSavePeriod(formData) {
    const conflict = timetable.find((entry) =>
      entry.id !== formData.id &&
      entry.day_of_week === formData.day_of_week &&
      Number(entry.period_number) === Number(formData.period_number)
    );
    if (conflict) throw new Error(`${formData.day_of_week} ${formData.period_number} is already assigned.`);

    if (formData.id) {
      await apiFetch(`/timetable/${formData.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      await apiFetch("/timetable", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }
    setPeriodModal(null);
    await fetchTimetable();
    showToast(formData.id ? "Period updated" : "Period added");
  }

  async function handleSaveSettings(nextSettings) {
    const saved = await apiFetch("/timetable-settings", {
      method: "PUT",
      body: JSON.stringify(nextSettings),
    });
    setSettings(normalizeSettings(saved));
    setSettingsOpen(false);
    await fetchSettings();
    await fetchTimetable();
    showToast("Timetable settings saved");
  }

  async function handleSaveEvent(formData) {
    const payload = {
      title: formData.title,
      event_type: formData.event_type,
      scope: formData.scope,
      class_id: formData.class_id,
      event_date: formData.scope === "monthly" ? formData.event_date : null,
      start_date: formData.scope === "yearly" ? formData.start_date : formData.event_date,
      end_date: formData.scope === "yearly" ? formData.end_date : formData.event_date,
      color: formData.color,
      description: formData.description,
    };

    if (formData.id) {
      await apiFetch(`/timetable-events/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await apiFetch("/timetable-events", { method: "POST", body: JSON.stringify(payload) });
    }
    setEventModal(null);
    await fetchEvents();
    showToast(formData.id ? "Event updated" : "Event added");
  }

  async function handleDeletePeriod(id) {
    await apiFetch(`/timetable/${id}`, { method: "DELETE" });
    setDeletePeriodId(null);
    setTimetable((prev) => prev.filter((entry) => entry.id !== id));
    showToast("Period deleted", "info");
  }

  async function handleDeleteEvent(id) {
    await apiFetch(`/timetable-events/${id}`, { method: "DELETE" });
    setDeleteEventId(null);
    setEvents((prev) => prev.filter((event) => event.id !== id));
    showToast("Event deleted", "info");
  }

  function handleExport() {
    const rows = mode === "weekly"
      ? [["Class", "Day", "Period", "Time", "Subject", "Teacher"], ...listEntries.map((entry) => {
          const period = settings.periods.find((item) => item.number === Number(entry.period_number));
          return [classLabel, entry.day_of_week, period?.label || entry.period_number, `${period?.start || ""}-${period?.end || ""}`, entry.subject, entry.teacher_name || ""];
        })]
      : [["Scope", "Class", "Title", "Type", "Start", "End"], ...visibleEvents.map((event) => [event.scope, event.class_id ? classLabel : "All", event.title, event.event_type, eventStartValue(event), eventEndValue(event)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable-${mode}-${classLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as CSV", "info");
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-medium">Loading timetable data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-80 max-w-full ml-10 lg:ml-0">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="Search subject, teacher, event..." className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchTimetable(); fetchEvents(); }} title="Refresh" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
              <RefreshCw size={16} className={loadingTimetable ? "animate-spin" : ""} />
            </button>
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
            </button>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">AP</div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">Admin</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Timetable</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {workingDays.length} days x {classPeriods.length} class periods - {classes.length} classes
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
                {["weekly", "monthly", "yearly"].map((item) => (
                  <button key={item} onClick={() => setMode(item)} className={`px-4 py-2.5 text-sm font-semibold capitalize ${mode === item ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    {item}
                  </button>
                ))}
              </div>
              <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
                <Settings size={15} /> Settings
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
                <Download size={15} /> Export
              </button>
              <button onClick={() => mode === "weekly" ? setPeriodModal({}) : setEventModal({ scope: mode })} disabled={!activeClassId} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-md shadow-blue-200">
                <Plus size={15} /> {mode === "weekly" ? "Add Period" : "Add Event"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Scheduled" value={totalPeriods} icon={CalendarDays} accent="text-blue-600" bg="bg-blue-50" sub={`out of ${totalSlots} weekly slots`} />
            <SummaryCard label="Free Slots" value={freeSlots} icon={Clock} accent="text-amber-600" bg="bg-amber-50" sub="Available class periods" />
            <SummaryCard label="Subjects" value={uniqueSubjects} icon={BookOpen} accent="text-violet-600" bg="bg-violet-50" sub="Unique subjects" />
            <SummaryCard label="Teachers" value={uniqueTeachers} icon={UserCog} accent="text-emerald-600" bg="bg-emerald-50" sub="Assigned teachers" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {classes.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">No classes found. Add classes first.</p>
              ) : classes.map((cls) => (
                <button key={cls.dbId} onClick={() => setActiveClassId(cls.dbId)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeClassId === cls.dbId ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {cls.grade}-{cls.section}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {workingDays.includes(todayName) && (
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">Today: {todayName}</span>
              )}
              {mode === "weekly" && (
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {[["grid", "Grid"], ["list", "List"]].map(([value, label]) => (
                    <button key={value} onClick={() => setWeeklyView(value)} className={`px-3.5 py-2 text-xs font-semibold ${weeklyView === value ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {mode === "weekly" && loadingTimetable ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          ) : mode === "weekly" && weeklyView === "grid" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 w-28">Period</th>
                      {workingDays.map((day) => (
                        <th key={day} className={`px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider w-36 ${day === todayName ? "text-blue-600 bg-blue-50/50" : "text-gray-400"}`}>
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settings.periods.map((period) => (
                      <tr key={period.number} className="hover:bg-gray-50/30">
                        <td className="px-3 py-2 text-center bg-gray-50/50 border-r border-gray-100">
                          <p className="text-xs font-bold text-gray-600">{period.label}</p>
                          <p className="text-[10px] text-gray-400">{period.start}-{period.end}</p>
                        </td>
                        {workingDays.map((day) => {
                          const entry = grid[day]?.[period.number];
                          return (
                            <td key={`${day}-${period.number}`} className={`px-2 py-2 ${day === todayName ? "bg-blue-50/20" : ""}`}>
                              <PeriodCell
                                period={period}
                                entry={entry}
                                onAdd={() => setPeriodModal({ day_of_week: day, period_number: period.number })}
                                onEdit={(item) => setPeriodModal(item)}
                                onDelete={setDeletePeriodId}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : mode === "weekly" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      {["Day", "Period", "Time", "Subject", "Teacher", ""].map((head) => (
                        <th key={head} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {listEntries.map((entry) => {
                      const period = settings.periods.find((item) => item.number === Number(entry.period_number));
                      const col = getColor(entry.subject);
                      return (
                        <tr key={entry.id} className="hover:bg-blue-50/30 group">
                          <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">{entry.day_of_week}</td>
                          <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{period?.label || `P${entry.period_number}`}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">{period ? `${period.start}-${period.end}` : ""}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.bg} ${col.text} ${col.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />{entry.subject}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700">{entry.teacher_name || ""}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                              <button onClick={() => setPeriodModal(entry)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                              <button onClick={() => setDeletePeriodId(entry.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : mode === "monthly" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">{monthDate.toLocaleString("default", { month: "long", year: "numeric" })}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Prev</button>
                  <button onClick={() => setMonthDate(new Date())} className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Today</button>
                  <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Next</button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const dayKey = toDateInput(day);
                  const dayEvents = monthlyEvents.filter((event) => eventStartValue(event) === dayKey);
                  return (
                    <button key={dayKey} onClick={() => setEventModal({ scope: "monthly", event_date: dayKey })} className={`min-h-32 border-r border-b border-gray-100 p-2 text-left hover:bg-blue-50/20 ${sameMonth(day, monthDate) ? "bg-white" : "bg-gray-50/60"}`}>
                      <span className={`text-xs font-bold ${sameMonth(day, monthDate) ? "text-gray-700" : "text-gray-300"}`}>{day.getDate()}</span>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div key={event.id} onClick={(e) => { e.stopPropagation(); setEventModal({ ...event }); }} className={`group/event flex items-center justify-between gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${EVENT_COLORS[event.color] || EVENT_COLORS.blue}`}>
                            <span className="truncate">{event.title}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setDeleteEventId(event.id); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteEventId(event.id);
                                }
                              }}
                              className="hidden rounded p-0.5 opacity-70 hover:bg-white/60 group-hover/event:inline-flex"
                              aria-label={`Delete ${event.title}`}
                            >
                              <Trash2 size={10} />
                            </span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && <p className="text-[11px] text-gray-400">+{dayEvents.length - 3} more</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Yearly Academic Planner</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Plan exams, holidays, events, sessions, and date ranges</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {yearlyEvents.length ? yearlyEvents.map((event) => (
                    <div key={event.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${EVENT_COLORS[event.color] || EVENT_COLORS.blue}`}>{event.event_type}</span>
                          <h3 className="text-sm font-bold text-gray-900">{event.title}</h3>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">{eventStartValue(event)} to {eventEndValue(event)} {event.class_id ? `- ${classLabel}` : "- All classes"}</p>
                        {event.description && <p className="mt-1 text-sm text-gray-500">{event.description}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => setEventModal({ ...event })} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteEventId(event.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-16 text-center text-gray-400">
                      <CalendarDays size={32} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">No yearly events planned</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
                <h3 className="text-sm font-bold text-gray-900">Planner Summary</h3>
                <div className="mt-4 space-y-3">
                  {["Exam", "Holiday", "Event", "Special Class"].map((type) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-gray-500">{type}</span>
                      <span className="font-bold text-gray-900">{yearlyEvents.filter((event) => event.event_type === type).length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {periodModal && (
        <PeriodModal
          initial={periodModal}
          onClose={() => setPeriodModal(null)}
          onSave={handleSavePeriod}
          teachers={teacherOptions}
          classId={activeClassId}
          settings={settings}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      )}
      {eventModal && (
        <EventModal
          initial={eventModal.id ? eventModal : null}
          scope={eventModal.scope || mode}
          classes={classes}
          activeClassId={activeClassId}
          onClose={() => setEventModal(null)}
          onSave={handleSaveEvent}
        />
      )}
      {(deletePeriodId || deleteEventId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Delete Item?</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDeletePeriodId(null); setDeleteEventId(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => deletePeriodId ? handleDeletePeriod(deletePeriodId) : handleDeleteEvent(deleteEventId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-200">Delete</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
