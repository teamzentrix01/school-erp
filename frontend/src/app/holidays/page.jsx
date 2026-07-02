"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { authHeaders } from "@/lib/auth";
import {
  Plus, Trash2, Calendar, Bell, ChevronDown,
  AlertCircle, CheckCircle, Loader2, X, Save,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  const color = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2 ${color}`}>
      {type === "error" ? "❌" : "✅"} {msg}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD HOLIDAY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddHolidayModal({ onClose, onSaved }) {
  const [date,        setDate]        = useState("");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  async function handleSave() {
    if (!date)         return setError("Please select a date.");
    if (!title.trim()) return setError("Holiday title is required.");
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/attendance/holidays`, {        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date, title: title.trim(), description: description.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Holiday</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mark a date as holiday. Attendance cannot be marked on this day.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setError(""); }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Diwali, Republic Day, Summer Break…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional notes…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700">
              <AlertCircle size={13} className="flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Add Holiday
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HolidaysPage() {
  const [holidays,   setHolidays]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [year,       setYear]       = useState(new Date().getFullYear());
  const [showModal,  setShowModal]  = useState(false);
  const [deleteConf, setDeleteConf] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [toast,      setToast]      = useState({ msg: "", type: "success" });

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/holidays?year=${year}`, { headers: authHeaders() });
      const data = await res.json();
      setHolidays(data || []);
    } catch {
      showToast("Failed to load holidays.", "error");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/holidays/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed.");
      setHolidays(prev => prev.filter(h => h.id !== id));
      setDeleteConf(null);
      showToast("Holiday removed.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  // Group holidays by month
  const grouped = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      const month = new Date(h.date).getMonth();
      if (!map[month]) map[month] = [];
      map[month].push(h);
    });
    return map;
  }, [holidays]);

  const today = new Date().toISOString().split("T")[0];
  const upcomingCount = holidays.filter(h => h.date >= today).length;
  const pastCount     = holidays.filter(h => h.date <  today).length;

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100
                           flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-64 max-w-full ml-10 lg:ml-0">
            <Calendar size={15} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500">Holiday Calendar {year}</span>
          </div>
          <div className="flex items-center gap-3">
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

        <div className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Page heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Holidays</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage school holidays. Teachers cannot mark attendance on holiday dates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Year selector */}
              <div className="relative">
                <select
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 hover:border-gray-300 transition-all"
                >
                  {[year - 1, year, year + 1].map(y => <option key={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-semibold shadow-md shadow-blue-200
                           transition-all hover:scale-[1.02] active:scale-[0.99]"
              >
                <Plus size={15} /> Add Holiday
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Holidays",  value: holidays.length, color: "text-blue-600",    bg: "bg-blue-50"   },
              { label: "Upcoming",        value: upcomingCount,   color: "text-amber-600",   bg: "bg-amber-50"  },
              { label: "Past",            value: pastCount,       color: "text-gray-600",    bg: "bg-gray-100"  },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-md transition-shadow">
                <p className={`text-3xl font-bold ${color}`}>{loading ? "—" : value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Holiday list grouped by month */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : holidays.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
              <Calendar size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-base font-semibold text-gray-500">No holidays added for {year}</p>
              <p className="text-sm text-gray-400 mt-1">Click &quot;Add Holiday&quot; to start</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([monthIdx, monthHolidays]) => (
                  <div key={monthIdx}>
                    {/* Month header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-bold">
                          {MONTHS[parseInt(monthIdx)].slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        {MONTHS[parseInt(monthIdx)]} {year}
                      </h2>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {monthHolidays.length} holiday{monthHolidays.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {monthHolidays.map(h => {
                        const isPast     = h.date < today;
                        const isToday    = h.date === today;
                        const isUpcoming = h.date > today;
                        return (
                          <div
                            key={h.id}
                            className={`flex items-center gap-4 p-4 bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md
                              ${isToday    ? "border-amber-300 bg-amber-50/30" :
                                isPast     ? "border-gray-100 opacity-70"      : "border-gray-100"}`}
                          >
                            {/* Date block */}
                            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center
                              ${isToday ? "bg-amber-500" : isPast ? "bg-gray-100" : "bg-blue-600"}`}>
                              <p className={`text-xl font-bold leading-none ${isToday || isUpcoming ? "text-white" : "text-gray-500"}`}>
                                {new Date(h.date).getDate()}
                              </p>
                              <p className={`text-[10px] font-semibold uppercase ${isToday || isUpcoming ? "text-white/80" : "text-gray-400"}`}>
                                {new Date(h.date).toLocaleDateString("en-IN", { weekday: "short" })}
                              </p>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 text-sm truncate">{h.title}</p>
                                {isToday && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                                    Today
                                  </span>
                                )}
                                {isUpcoming && (
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.date)}</p>
                              {h.description && (
                                <p className="text-xs text-gray-500 mt-1">{h.description}</p>
                              )}
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConf(h)}
                              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showModal && (
        <AddHolidayModal
          onClose={() => setShowModal(false)}
          onSaved={() => { load(); showToast("Holiday added successfully."); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Remove Holiday?</h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold">{deleteConf.title}</span>
                <br />
                <span className="text-xs">{formatDate(deleteConf.date)}</span>
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
                ⚠ Teachers will be able to mark attendance on this date after removal.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConf(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConf.id)} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-200 transition-all disabled:opacity-60">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast({ msg: "", type: "success" })} />
    </div>
  );
}
