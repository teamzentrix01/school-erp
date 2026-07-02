"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHomeworkForm from "@/components/TeacherHomeworkForm";
import { apiFetch } from "@/lib/api";
import {
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CalendarCheck,
  AlertCircle,
  Loader2,
  Save,
  ChevronDown,
  RefreshCw,
  Eye,
  Pencil,
  PartyPopper,
  BookOpen,
  GraduationCap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];
function initials(name = "") {
  const p = name.trim().split(" ").filter(Boolean);
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function avatarBg(name = "") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CHIP
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Present: {
    bg: "bg-green-500",
    ring: "ring-green-300",
    label: "Present",
    icon: CheckCircle,
  },
  Absent: {
    bg: "bg-red-500",
    ring: "ring-red-300",
    label: "Absent",
    icon: XCircle,
  },
  Leave: {
    bg: "bg-amber-400",
    ring: "ring-amber-300",
    label: "Leave",
    icon: Clock,
  },
};

function StatusChip({ status, onChange, disabled }) {
  const options = ["Present", "Absent", "Leave"];
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Present;
  const Icon = cfg.icon;

  if (disabled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white ${cfg.bg}`}
      >
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const c = STATUS_CONFIG[opt];
        const active = status === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
              active
                ? `${c.bg} text-white border-transparent shadow-sm ring-2 ${c.ring}`
                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  const color =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : type === "warning"
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-green-50 border-green-200 text-green-700";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm ${color}`}
    >
      {type === "error" ? "❌" : type === "warning" ? "⚠️" : "✅"} {msg}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY BAR
// ─────────────────────────────────────────────────────────────────────────────
function SummaryBar({ records }) {
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const leave = records.filter((r) => r.status === "Leave").length;
  const total = records.length;

  return (
    <div className="flex flex-wrap gap-3">
      {[
        {
          label: "Present",
          count: present,
          color: "bg-green-50 text-green-700 border-green-200",
        },
        {
          label: "Absent",
          count: absent,
          color: "bg-red-50   text-red-700   border-red-200",
        },
        {
          label: "Leave",
          count: leave,
          color: "bg-amber-50 text-amber-700 border-amber-200",
        },
        {
          label: "Total",
          count: total,
          color: "bg-gray-50  text-gray-700  border-gray-200",
        },
      ].map(({ label, count, color }) => (
        <div
          key={label}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${color}`}
        >
          <span className="text-lg font-bold">{count}</span>
          <span className="text-xs font-medium opacity-70">{label}</span>
        </div>
      ))}
      {total > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-blue-50 text-blue-700 border-blue-200 text-sm font-semibold">
          <span className="text-lg font-bold">
            {Math.round((present / total) * 100)}%
          </span>
          <span className="text-xs font-medium opacity-70">Attendance</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPCOMING HOLIDAYS CARD
// ─────────────────────────────────────────────────────────────────────────────
function UpcomingHolidays({ holidays }) {
  if (!holidays || holidays.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
        <span className="text-base">🎉</span>
        <h3 className="text-sm font-bold text-amber-800">Upcoming Holidays</h3>
        <span className="ml-auto text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
          {holidays.length}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {holidays.map((h) => {
          const daysLeft = Math.ceil(
            (new Date(h.date) - new Date(todayStr())) / (1000 * 60 * 60 * 24),
          );
          const isTomorrow = daysLeft === 1;
          const isVerySoon = daysLeft <= 3;
          return (
            <div
              key={h.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors"
            >
              <div
                className={`flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center
                ${isTomorrow ? "bg-red-500" : isVerySoon ? "bg-amber-500" : "bg-blue-600"}`}
              >
                <p className="text-white text-sm font-bold leading-none">
                  {new Date(h.date).getDate()}
                </p>
                <p className="text-white/80 text-[9px] font-semibold uppercase">
                  {new Date(h.date).toLocaleDateString("en-IN", {
                    month: "short",
                  })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {h.title}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(h.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>{" "}
              </div>
              <span
                className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${
                  isTomorrow
                    ? "bg-red-100 text-red-600"
                    : isVerySoon
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {isTomorrow ? "Tomorrow" : `${daysLeft}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY CLASS TAB (Attendance)
// ─────────────────────────────────────────────────────────────────────────────
function MyClassTab() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeClassIdx, setActiveClassIdx] = useState(0);
  const [date, setDate] = useState(todayStr());
  const [attStatus, setAttStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [mode, setMode] = useState("view");
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const showToast = useCallback(
    (msg, type = "success") => setToast({ msg, type }),
    [],
  );
  const activeClass = classes[activeClassIdx] ?? null;

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cl, st] = await Promise.allSettled([
        apiFetch("/teacher/classes"),
        apiFetch("/teacher/students"),
      ]);
      if (cl.status === "fulfilled")
        setClasses(Array.isArray(cl.value) ? cl.value : []);
      if (st.status === "fulfilled")
        setStudents(Array.isArray(st.value) ? st.value : []);
      if (cl.status === "rejected" || st.status === "rejected") {
        setError("Some class data could not be loaded.");
      }
    } catch {
      setError("Could not load class data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  const loadAttStatus = useCallback(async () => {
    if (!activeClass) return;
    setAttLoading(true);
    setMode("view");
    setRecords([]);
    try {
      const [status, holidaysData] = await Promise.allSettled([
        apiFetch(`/attendance/status?class_id=${activeClass.id}&date=${date}`),
        apiFetch(`/attendance/holidays?year=${new Date().getFullYear()}`),
      ]);
      if (status.status === "fulfilled") {
        setAttStatus(status.value);
        if (status.value.alreadyMarked) {
          const existing = await apiFetch(
            `/attendance/records?class_id=${activeClass.id}&date=${date}`,
          );
          setRecords(Array.isArray(existing) ? existing : []);
        }
      }
      if (holidaysData.status === "fulfilled") {
        const today = todayStr();
        const upcoming = (
          Array.isArray(holidaysData.value) ? holidaysData.value : []
        )
          .filter((h) => h.date > today)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5);
        setUpcomingHolidays(upcoming);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAttLoading(false);
    }
  }, [activeClass, date, showToast]);

  useEffect(() => {
    loadAttStatus();
  }, [loadAttStatus]);

  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return students
      .filter((s) => s.class_id === activeClass.id)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [students, activeClass]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.roll_number?.toString().includes(q),
    );
  }, [classStudents, search]);

  const startMarking = useCallback(() => {
    const draft = classStudents.map((s) => ({
      student_id: s.id,
      name: s.name,
      roll: s.roll_number,
      status: "Present",
      note: "",
    }));
    setRecords(draft);
    setMode("mark");
  }, [classStudents]);

  const startEditing = useCallback(() => {
    setMode("edit");
  }, []);

  const updateStatus = useCallback((studentId, status) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)),
    );
  }, []);

  const markAll = useCallback((status) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!activeClass || records.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        class_id: activeClass.id,
        date,
        records: records.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          note: r.note || null,
        })),
      };
      if (mode === "edit") {
        await apiFetch("/attendance/update", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Attendance updated successfully.");
      } else {
        await apiFetch("/attendance/mark", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Attendance marked successfully.");
      }
      await loadAttStatus();
      setMode("view");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }, [activeClass, date, records, mode, loadAttStatus, showToast]);

  const displayRecords = useMemo(() => {
    if (mode === "view" && attStatus?.alreadyMarked) return records;
    if (mode !== "view") {
      const map = Object.fromEntries(records.map((r) => [r.student_id, r]));
      return filtered.map(
        (s) =>
          map[s.id] ?? {
            student_id: s.id,
            name: s.name,
            roll: s.roll_number,
            status: "Present",
            note: "",
          },
      );
    }
    return filtered;
  }, [mode, attStatus, records, filtered]);

  return (
    <>
      {/* Sub-header: date picker + search + refresh */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => {
            setDate(e.target.value);
            setMode("view");
          }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-52">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
        <button
          onClick={loadBase}
          title="Refresh"
          className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between mb-4">
          {error}
          <button
            onClick={loadBase}
            className="text-red-700 font-semibold text-xs ml-4 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Class tabs */}
      {classes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {classes.map((cls, i) => (
            <button
              key={cls.id || i}
              onClick={() => {
                setActiveClassIdx(i);
                setSearch("");
                setMode("view");
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                i === activeClassIdx
                  ? "bg-emerald-500 text-white border-transparent shadow-md"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
              }`}
            >
              Class {cls.grade || cls.class_name}-{cls.section}
            </button>
          ))}
        </div>
      )}

      {/* Attendance status banner */}
      {activeClass && !attLoading && attStatus && (
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 ${
            attStatus.isHoliday
              ? "bg-amber-50 border-amber-200"
              : attStatus.alreadyMarked
                ? "bg-green-50 border-green-200"
                : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                attStatus.isHoliday
                  ? "bg-amber-100"
                  : attStatus.alreadyMarked
                    ? "bg-green-100"
                    : "bg-blue-100"
              }`}
            >
              {attStatus.isHoliday ? (
                <span className="text-xl">🎉</span>
              ) : attStatus.alreadyMarked ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <CalendarCheck size={20} className="text-blue-600" />
              )}
            </div>
            <div>
              <p
                className={`font-bold text-sm ${
                  attStatus.isHoliday
                    ? "text-amber-800"
                    : attStatus.alreadyMarked
                      ? "text-green-800"
                      : "text-blue-800"
                }`}
              >
                {attStatus.isHoliday
                  ? `Holiday: ${attStatus.holidayTitle}`
                  : attStatus.alreadyMarked
                    ? "Attendance Marked ✓"
                    : "Attendance Not Marked Yet"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(date)}</p>
              {attStatus.alreadyMarked && (
                <p className="text-xs text-green-600 mt-0.5">
                  {attStatus.markedCount} students marked
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!attStatus.isHoliday &&
              !attStatus.alreadyMarked &&
              mode === "view" && (
                <button
                  onClick={startMarking}
                  disabled={classStudents.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  <CalendarCheck size={15} /> Mark Attendance
                </button>
              )}
            {attStatus.alreadyMarked && mode === "view" && (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-700 hover:bg-green-50 transition-all"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            {(mode === "mark" || mode === "edit") && (
              <>
                <button
                  onClick={() => {
                    setMode("view");
                    loadAttStatus();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? "Saving…" : mode === "edit" ? "Update" : "Submit"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {attLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Checking attendance
          status…
        </div>
      )}

      <UpcomingHolidays holidays={upcomingHolidays} />

      {/* Bulk actions */}
      {(mode === "mark" || mode === "edit") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Bulk Actions</p>
            <p className="text-xs text-gray-400">
              Apply status to all {filtered.length} visible students
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["Present", "Absent", "Leave"].map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => markAll(s)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold ${cfg.bg} hover:opacity-90 transition-all`}
                >
                  All {s}
                </button>
              );
            })}
          </div>
          <SummaryBar records={records} />
        </div>
      )}

      {/* Student list */}
      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !activeClass ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <div className="text-5xl mb-3">🏫</div>
            <p className="text-sm font-semibold text-gray-500">
              No class assigned to you yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact admin to get assigned
            </p>
          </div>
        ) : (
          <>
            {/* Class info banner */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Users size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900">
                  Class{" "}
                  {(activeClass.class_name || "").replace(/^Class\s+/i, "") ||
                    activeClass.grade}{" "}
                  – Section {activeClass.section}
                </h2>
                {activeClass.room_no && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Room: {activeClass.room_no}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-2 border border-emerald-100 flex-shrink-0">
                <Users size={15} />
                <span className="text-sm font-bold">
                  {classStudents.length}
                </span>
                <span className="text-xs">students</span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      "#",
                      "Student",
                      "Roll No.",
                      "Gender",
                      "Phone",
                      "Guardian",
                      ...(mode !== "view" || attStatus?.alreadyMarked
                        ? ["Attendance"]
                        : []),
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(mode !== "view" ? displayRecords : filtered).length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-gray-400 text-sm"
                      >
                        {search
                          ? "No students match your search"
                          : "No students in this class"}
                      </td>
                    </tr>
                  ) : (
                    (mode !== "view" ? displayRecords : filtered).map(
                      (s, i) => {
                        const student =
                          students.find(
                            (st) => st.id === (s.student_id ?? s.id),
                          ) ?? s;
                        const rec = records.find(
                          (r) => r.student_id === (s.student_id ?? s.id),
                        );
                        return (
                          <tr
                            key={s.student_id ?? s.id ?? i}
                            className={`border-b border-gray-50 hover:bg-emerald-50/30 transition-colors ${
                              rec?.status === "Absent"
                                ? "bg-red-50/20"
                                : rec?.status === "Leave"
                                  ? "bg-amber-50/20"
                                  : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl ${avatarBg(s.name || student.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                                >
                                  {initials(s.name || student.name || "")}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {s.name || student.name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {student.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {s.roll ?? student.roll_number ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {student.gender || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {student.phone || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {student.guardian_name || "—"}
                            </td>
                            {(mode !== "view" || attStatus?.alreadyMarked) && (
                              <td className="px-4 py-3">
                                <StatusChip
                                  status={rec?.status ?? "Present"}
                                  disabled={mode === "view"}
                                  onChange={(st) =>
                                    updateStatus(s.student_id ?? s.id, st)
                                  }
                                />
                              </td>
                            )}
                          </tr>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {(mode !== "view" ? displayRecords : filtered).map((s, i) => {
                const student =
                  students.find((st) => st.id === (s.student_id ?? s.id)) ?? s;
                const rec = records.find(
                  (r) => r.student_id === (s.student_id ?? s.id),
                );
                return (
                  <div
                    key={s.student_id ?? s.id ?? i}
                    className={`bg-white rounded-2xl border shadow-sm p-4 ${
                      rec?.status === "Absent"
                        ? "border-red-200"
                        : rec?.status === "Leave"
                          ? "border-amber-200"
                          : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${avatarBg(s.name || student.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                      >
                        {initials(s.name || student.name || "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {s.name || student.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Roll: {s.roll ?? student.roll_number ?? "—"}
                        </p>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        #{i + 1}
                      </span>
                    </div>
                    {(mode !== "view" || attStatus?.alreadyMarked) && (
                      <StatusChip
                        status={rec?.status ?? "Present"}
                        disabled={mode === "view"}
                        onChange={(st) =>
                          updateStatus(s.student_id ?? s.id, st)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {!search && mode === "view" && (
              <p className="text-xs text-gray-400 text-center">
                {classStudents.length} students in alphabetical order
              </p>
            )}
          </>
        )}
      </div>

      <Toast
        msg={toast.msg}
        type={toast.type}
        onDismiss={() => setToast({ msg: "", type: "success" })}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE  (with tabs)
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "class", label: "My Class", icon: GraduationCap },
  { id: "homework", label: "Homework", icon: BookOpen },
];

export default function TeacherClassPage() {
  const [activeTab, setActiveTab] = useState("class");

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* ── Page Header ── */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Class</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Students, Attendance & Homework
            </p>
          </div>

          {/* ── Tabs ── */}
          <div className="pl-10 lg:pl-0 flex gap-1 mt-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "class" && <MyClassTab />}
          {activeTab === "homework" && <TeacherHomeworkForm />}
        </div>
      </main>
    </div>
  );
}
