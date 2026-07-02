"use client";

import { useState, useEffect, useCallback } from "react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";
import { Bell, Pin, AlertCircle, ChevronDown, RefreshCw } from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  General: { bg: "bg-gray-100", text: "text-gray-700" },
  Academic: { bg: "bg-blue-50", text: "text-blue-700" },
  Exam: { bg: "bg-violet-50", text: "text-violet-700" },
  Holiday: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Event: { bg: "bg-amber-50", text: "text-amber-700" },
  Urgent: { bg: "bg-red-50", text: "text-red-700" },
};

const ALL_CATEGORIES = [
  "All",
  "General",
  "Academic",
  "Exam",
  "Holiday",
  "Event",
  "Urgent",
];

// ── NoticeCard ────────────────────────────────────────────────────────────────
function NoticeCard({ n }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORY_STYLE[n.category] ?? CATEGORY_STYLE.General;
  const isUrgent = n.priority === "Urgent";

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${isUrgent ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left"
      >
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
          ${isUrgent ? "bg-red-100" : n.is_pinned ? "bg-violet-100" : "bg-gray-100"}`}
        >
          {isUrgent ? (
            <AlertCircle size={18} className="text-red-600" />
          ) : n.is_pinned ? (
            <Pin size={18} className="text-violet-600" />
          ) : (
            <Bell size={18} className="text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {n.is_pinned && (
              <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-semibold">
                📌 Pinned
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}
            >
              {n.category}
            </span>
            {n.priority && n.priority !== "Normal" && (
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full
                ${isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
              >
                {n.priority}
              </span>
            )}
          </div>

          <p className="text-sm font-bold text-gray-900 leading-snug">
            {n.title}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {n.author ?? "Admin"} ·{" "}
            {new Date(n.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={`flex-shrink-0 mt-1.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <p
            className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap
            bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            {n.content}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentNoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/student/notices");
      setNotices(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load notices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = notices.filter((n) => {
    const matchCat = category === "All" || n.category === category;
    const matchSearch =
      !search || (n.title || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const pinned = filtered.filter((n) => n.is_pinned);
  const unpinned = filtered.filter((n) => !n.is_pinned);

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notices</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                All announcements for students
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors self-start sm:self-auto"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Search + filter bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
              <svg
                className="w-4 h-4 text-gray-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notices…"
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors
                    ${
                      category === c
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
              {filtered.length} notice{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {error}
              <button
                onClick={load}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-100 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Pinned */}
          {!loading && pinned.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                📌 Pinned
              </p>
              <div className="space-y-3">
                {pinned.map((n) => (
                  <NoticeCard key={n.id} n={n} />
                ))}
              </div>
            </div>
          )}

          {/* All notices */}
          {!loading && unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                  All Notices
                </p>
              )}
              <div className="space-y-3">
                {unpinned.map((n) => (
                  <NoticeCard key={n.id} n={n} />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
              <Bell size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-base font-semibold text-gray-500">
                No notices found
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search || category !== "All"
                  ? "Try clearing your filters"
                  : "No announcements yet"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
