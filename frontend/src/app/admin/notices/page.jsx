"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Bell, ChevronDown, Search, Download, Plus, X, Save,
  AlertCircle, CheckCircle, Loader2, RefreshCw,
  ClipboardList, Calendar, Tag, Eye, Trash2, Pencil,
  Pin, Users, BookOpen, GraduationCap, Megaphone,
} from "lucide-react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin`;

const CATEGORIES   = ["All", "General", "Academic", "Exam", "Holiday", "Event", "Urgent"];
const PRIORITIES   = ["Normal", "Important", "Urgent"];
const ROWS_PER_PAGE = 8;

// Audience — 3 checkbox options stored as comma-separated string in DB
const AUDIENCE_OPTIONS = [
  { key: "All Students", label: "All Students", bgActive: "bg-blue-600",    bgIdle: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    borderActive: "border-blue-600"    },
  { key: "All Teachers", label: "All Teachers", bgActive: "bg-emerald-600", bgIdle: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", borderActive: "border-emerald-600" },
];

function parseAudience(str) {
  if (!str) return new Set();
  return new Set(str.split(",").map(s => s.trim()).filter(Boolean));
}
function serializeAudience(set) {
  if (set.size === 0) return "";
  return [...set].join(",");
}
function audienceLabel(str) {
  if (!str) return "—";
  const parts = str.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return "Both";
  return parts[0] ?? "—";
}

const CATEGORY_STYLES = {
  General:  { bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400"    },
  Academic: { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500"    },
  Exam:     { bg: "bg-violet-50",   text: "text-violet-700",  dot: "bg-violet-500"  },
  Holiday:  { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  Event:    { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  Urgent:   { bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500"     },
};

const PRIORITY_STYLES = {
  Normal:    { badge: "bg-gray-100  text-gray-500  ring-gray-200",   dot: "bg-gray-400"   },
  Important: { badge: "bg-amber-50  text-amber-700 ring-amber-200",  dot: "bg-amber-500"  },
  Urgent:    { badge: "bg-red-50    text-red-700   ring-red-200",    dot: "bg-red-500"    },
};

// ─────────────────────────────────────────────
// API HELPER
// ─────────────────────────────────────────────
function authHeaders() {
  const token =
    (typeof window !== "undefined" &&
      document.cookie.split("; ").find(r => r.startsWith("token="))?.split("=")[1]) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
    "";
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

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

function SummaryCard({ label, value, icon: Icon, accent, bg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
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

function CategoryBadge({ category }) {
  const s = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.General;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{category}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Normal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{priority}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  );
}


// ─────────────────────────────────────────────
// NOTICE DETAIL MODAL
// ─────────────────────────────────────────────

function NoticeDetailModal({ notice, onClose, onEdit, onDelete }) {
  const cat = CATEGORY_STYLES[notice.category] ?? CATEGORY_STYLES.General;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`px-6 py-5 border-b border-gray-100 ${notice.priority === "Urgent" ? "bg-red-50" : "bg-gray-50/50"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <CategoryBadge category={notice.category} />
                <PriorityBadge priority={notice.priority} />
                {notice.is_pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-full">
                    <Pin size={10} /> Pinned
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{notice.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Published",  val: new Date(notice.created_at || notice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), icon: Calendar },
              { label: "Audience",   val: audienceLabel(notice.audience), icon: Users },
              { label: "Posted by",  val: notice.author   ?? "Admin", icon: GraduationCap },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className="text-gray-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">{val}</p>
              </div>
            ))}
          </div>

          {/* Content */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Content</p>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
              {notice.content || notice.body || "No content provided."}
            </div>
          </div>

          {/* Attachment (if any) */}
          {notice.attachment && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <BookOpen size={14} className="text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">{notice.attachment}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex gap-2">
            <button onClick={() => { onEdit(notice); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => { onDelete(notice.id); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-all">
              <Trash2 size={14} /> Delete
            </button>
          </div>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// ADD / EDIT NOTICE MODAL
// ─────────────────────────────────────────────

const EMPTY_NOTICE = {
  title:     "",
  content:   "",
  category:  "General",
  priority:  "Normal",
  audience:  "All Students",
  is_pinned: false,
};

function NoticeModal({ initial, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form,    setForm]    = useState(initial ? { ...initial } : { ...EMPTY_NOTICE });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: "" })); }

  function validate() {
    const e = {};
    if (!form.title.trim())   e.title   = "Title is required";
    if (!form.content.trim()) e.content = "Content is required";
    if (!form.audience || parseAudience(form.audience).size === 0) e.audience = "Select at least one audience";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) {
      setErrors({ content: err.message });
    } finally {
      setLoading(false);
    }
  }

  const inp = (key) => `w-full px-3 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all ${errors[key] ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`;
  const sel = "w-full appearance-none px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Notice" : "Create Notice"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? "Update notice details" : "Publish a new notice to students or staff"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="e.g. Annual Sports Day Notice" className={inp("title")} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Category</label>
              <div className="relative">
                <select value={form.category} onChange={e => set("category", e.target.value)} className={sel}>
                  {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Priority</label>
              <div className="relative">
                <select value={form.priority} onChange={e => set("priority", e.target.value)} className={sel}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Audience — checkboxes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Audience <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AUDIENCE_OPTIONS.map(opt => {
                const selected = parseAudience(form.audience);
                const isChecked = selected.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      const next = new Set(parseAudience(form.audience));
                      if (next.has(opt.key)) next.delete(opt.key);
                      else next.add(opt.key);
                      set("audience", serializeAudience(next));
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
                      ${isChecked
                        ? `${opt.bgActive} border-transparent text-white shadow-md`
                        : `${opt.bgIdle} ${opt.border} ${opt.text} hover:border-opacity-60`
                      }`}
                  >
                    {/* Custom checkbox circle */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isChecked ? "border-white bg-white/30" : `${opt.border} bg-white`}`}>
                      {isChecked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight ${isChecked ? "text-white" : ""}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
              {/* "Both" = auto-computed shortcut */}
              <button
                type="button"
                onClick={() => {
                  const all = new Set(AUDIENCE_OPTIONS.map(o => o.key));
                  const current = parseAudience(form.audience);
                  const isBoth = AUDIENCE_OPTIONS.every(o => current.has(o.key));
                  set("audience", isBoth ? "" : serializeAudience(all));
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
                  ${AUDIENCE_OPTIONS.every(o => parseAudience(form.audience).has(o.key))
                    ? "bg-violet-600 border-transparent text-white shadow-md"
                    : "bg-violet-50 border-violet-200 text-violet-700 hover:border-violet-300"
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${AUDIENCE_OPTIONS.every(o => parseAudience(form.audience).has(o.key))
                    ? "border-white bg-white/30"
                    : "border-violet-300 bg-white"}`}>
                  {AUDIENCE_OPTIONS.every(o => parseAudience(form.audience).has(o.key)) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-bold text-center leading-tight ${AUDIENCE_OPTIONS.every(o => parseAudience(form.audience).has(o.key)) ? "text-white" : ""}`}>
                  Both
                </span>
              </button>
            </div>
            {errors.audience && <p className="text-xs text-red-500 mt-1">{errors.audience}</p>}
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Content *</label>
            <textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              rows={6}
              placeholder="Write the notice content here…"
              className={`${inp("content")} resize-none`}
            />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
          </div>

          {/* Pin toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <button
              onClick={() => set("is_pinned", !form.is_pinned)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.is_pinned ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_pinned ? "left-5" : "left-0.5"}`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Pin size={13} /> Pin this notice</p>
              <p className="text-xs text-gray-400">Pinned notices appear at the top</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all hover:scale-[1.02]">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? "Update Notice" : "Publish Notice"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// NOTICES PAGE
// ─────────────────────────────────────────────

export default function NoticesPage() {
  const [notices,      setNotices]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterCat,    setFilterCat]    = useState("All");
  const [filterPrio,   setFilterPrio]   = useState("All");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);   // null | { mode:"add"|"edit", notice? }
  const [detailNotice, setDetailNotice] = useState(null);   // notice to view
  const [deleteConf,   setDeleteConf]   = useState(null);   // id to delete
  const [toast,        setToast]        = useState(null);

  function showToast(msg, type = "success") {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch notices ──
  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/notices");
      // Sort: pinned first, then by date desc
      setNotices(
        [...data].sort((a, b) => {
          if (b.is_pinned !== a.is_pinned) return b.is_pinned ? 1 : -1;
          return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
        })
      );
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  // ── Filter ──
  const filtered = useMemo(() => notices.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(q) ||
      (n.content || n.body || "").toLowerCase().includes(q);
    const matchCat  = filterCat  === "All" || n.category === filterCat;
    const matchPrio = filterPrio === "All" || n.priority === filterPrio;
    return matchSearch && matchCat && matchPrio;
  }), [notices, search, filterCat, filterPrio]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  function goPage(p) { setPage(Math.min(Math.max(1, p), totalPages)); }

  // ── Stats ──
  const pinned  = notices.filter(n => n.is_pinned).length;
  const urgent  = notices.filter(n => n.priority === "Urgent").length;
  const today   = notices.filter(n => {
    const d = new Date(n.created_at || n.date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  // ── Save (create / update) ──
  async function handleSave(form) {
    if (form.id) {
      await apiFetch(`/notices/${form.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      showToast("Notice updated");
    } else {
      await apiFetch("/notices", {
        method: "POST",
        body: JSON.stringify(form),
      });
      showToast("Notice published");
    }
    await fetchNotices();
    setModal(null);
  }

  // ── Delete ──
  async function handleDelete(id) {
    try {
      await apiFetch(`/notices/${id}`, { method: "DELETE" });
      setNotices(prev => prev.filter(n => n.id !== id));
      setDeleteConf(null);
      showToast("Notice deleted", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ── Toggle pin ──
  async function handleTogglePin(notice) {
    try {
      await apiFetch(`/notices/${notice.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...notice, is_pinned: !notice.is_pinned }),
      });
      setNotices(prev =>
        [...prev.map(n => n.id === notice.id ? { ...n, is_pinned: !n.is_pinned } : n)]
          .sort((a, b) => {
            if (b.is_pinned !== a.is_pinned) return b.is_pinned ? 1 : -1;
            return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
          })
      );
      showToast(notice.is_pinned ? "Notice unpinned" : "Notice pinned", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ── Export CSV ──
  function handleExport() {
    const rows = [
      ["ID", "Title", "Category", "Priority", "Audience", "Pinned", "Date"],
      ...filtered.map(n => [n.id, n.title, n.category, n.priority, n.audience, n.is_pinned ? "Yes" : "No", new Date(n.created_at || n.date).toLocaleDateString("en-IN")]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "notices.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as CSV", "info");
  }

  const HEADERS = ["Notice", "Category", "Priority", "Audience", "Date", "Actions"];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">

        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100
                           flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-64 max-w-full ml-10 lg:ml-0">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Search notices…" value={search}
              onChange={e => { setSearch(e.target.value); goPage(1); }}
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchNotices} title="Refresh"
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
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

        {/* ── Body ── */}
        <div className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Page heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notices</h1>
              <p className="text-sm text-gray-500 mt-0.5">Publish and manage school announcements</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white
                           text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Download size={15} /> Export
              </button>
              <button onClick={() => setModal({ mode: "add" })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.99]">
                <Plus size={15} /> Create Notice
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Notices"   value={notices.length} icon={Megaphone}    accent="text-blue-600"   bg="bg-blue-50"   sub="All published notices"    />
            <SummaryCard label="Pinned"          value={pinned}         icon={Pin}          accent="text-violet-600" bg="bg-violet-50" sub="Shown at top"              />
            <SummaryCard label="Urgent"          value={urgent}         icon={AlertCircle}  accent="text-red-600"    bg="bg-red-50"    sub={urgent > 0 ? "Needs attention" : "None urgent"} />
            <SummaryCard label="Posted Today"    value={today}          icon={Calendar}     accent="text-emerald-600"bg="bg-emerald-50"sub="New today"                 />
          </div>

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4
                          flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" value={search} placeholder="Search title, content..."
                onChange={e => { setSearch(e.target.value); goPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50
                           text-sm text-gray-800 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all" />
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {/* Category */}
              <div className="relative">
                <select value={filterCat} onChange={e => { setFilterCat(e.target.value); goPage(1); }}
                  className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white
                             text-sm text-gray-700 font-medium cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-blue-300 hover:border-gray-300 transition-all">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {/* Priority */}
              <div className="relative">
                <select value={filterPrio} onChange={e => { setFilterPrio(e.target.value); goPage(1); }}
                  className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white
                             text-sm text-gray-700 font-medium cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-blue-300 hover:border-gray-300 transition-all">
                  <option value="All">All Priority</option>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <p className="text-sm text-gray-400 self-center whitespace-nowrap">{filtered.length} notices</p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? <Spinner /> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        {HEADERS.map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginated.map(notice => (
                        <tr key={notice.id}
                          className={`hover:bg-blue-50/30 transition-colors group ${notice.priority === "Urgent" ? "bg-red-50/20" : ""}`}>

                          {/* Notice title */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                                ${notice.priority === "Urgent" ? "bg-red-100" : notice.is_pinned ? "bg-blue-100" : "bg-gray-100"}`}>
                                {notice.priority === "Urgent"
                                  ? <AlertCircle size={16} className="text-red-600" />
                                  : notice.is_pinned
                                  ? <Pin size={16} className="text-blue-600" />
                                  : <Megaphone size={16} className="text-gray-500" />
                                }
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900 text-sm truncate max-w-[220px]">{notice.title}</p>
                                  {notice.is_pinned && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">Pinned</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5">
                                  {(notice.content || notice.body || "").slice(0, 60)}{(notice.content || notice.body || "").length > 60 ? "…" : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-5 py-4"><CategoryBadge category={notice.category} /></td>

                          {/* Priority */}
                          <td className="px-5 py-4"><PriorityBadge priority={notice.priority} /></td>

                          {/* Audience */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <Users size={12} className="text-gray-400 flex-shrink-0" />
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                                ${audienceLabel(notice.audience) === "Both"
                                  ? "bg-violet-50 text-violet-700"
                                  : audienceLabel(notice.audience) === "All Students"
                                  ? "bg-blue-50 text-blue-700"
                                  : audienceLabel(notice.audience) === "All Teachers"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                                }`}>
                                {audienceLabel(notice.audience)}
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar size={11} className="text-gray-400" />
                              {new Date(notice.created_at || notice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setDetailNotice(notice)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => handleTogglePin(notice)}
                                className={`p-1.5 rounded-lg transition-colors ${notice.is_pinned ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`} title={notice.is_pinned ? "Unpin" : "Pin"}>
                                <Pin size={14} />
                              </button>
                              <button onClick={() => setModal({ mode: "edit", notice })}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setDeleteConf(notice.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {paginated.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Megaphone size={32} className="mb-3 opacity-40" />
                      <p className="text-sm font-medium">No notices found</p>
                      <button onClick={() => setModal({ mode: "add" })}
                        className="mt-3 text-xs text-blue-600 font-semibold hover:underline">
                        + Create first notice
                      </button>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                  <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Showing <span className="font-semibold text-gray-600">{Math.min((page - 1) * ROWS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ROWS_PER_PAGE, filtered.length)}</span>{" "}
                      of <span className="font-semibold text-gray-600">{filtered.length}</span> notices
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => goPage(page - 1)} disabled={page === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all">
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => goPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${p === page ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-gray-500 hover:bg-gray-100"}`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => goPage(page + 1)} disabled={page === totalPages}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all">
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {modal && (
        <NoticeModal
          initial={modal.notice}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {detailNotice && (
        <NoticeDetailModal
          notice={detailNotice}
          onClose={() => setDetailNotice(null)}
          onEdit={notice => setModal({ mode: "edit", notice })}
          onDelete={id => { setDeleteConf(id); setDetailNotice(null); }}
        />
      )}

      {deleteConf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Delete Notice?</h3>
              <p className="text-sm text-gray-500 mt-1">This notice will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConf(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={() => handleDelete(deleteConf)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-200 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
