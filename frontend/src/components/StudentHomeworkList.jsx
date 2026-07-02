"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Bell,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api"; // your existing helper

// ── helpers ───────────────────────────────────────────────────────────────────
function getDueBadge(dueDateStr) {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = due - now;
  const diffD = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffD < 0)
    return { label: "Overdue", bg: "bg-red-100", text: "text-red-700" };
  if (diffD === 0)
    return { label: "Due Today", bg: "bg-amber-100", text: "text-amber-700" };
  if (diffD <= 2)
    return {
      label: `${diffD}d left`,
      bg: "bg-orange-50",
      text: "text-orange-700",
    };
  return { label: `${diffD}d left`, bg: "bg-gray-100", text: "text-gray-500" };
}

const SUBJECT_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-700", icon: "bg-blue-100" },
  { bg: "bg-violet-50", text: "text-violet-700", icon: "bg-violet-100" },
  { bg: "bg-emerald-50", text: "text-emerald-700", icon: "bg-emerald-100" },
  { bg: "bg-amber-50", text: "text-amber-700", icon: "bg-amber-100" },
  { bg: "bg-pink-50", text: "text-pink-700", icon: "bg-pink-100" },
];

function subjectColor(subject = "") {
  const idx = subject.charCodeAt(0) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[idx];
}

function Skeleton({ h = "h-20" }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

// ── StudentHomeworkList ────────────────────────────────────────────────────────
export default function StudentHomeworkList() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "pending" | "overdue"

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/homework/student");
      setData(Array.isArray(res) ? res : []);
    } catch {
      setError("Failed to load homework.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── filter ──
  const filtered = (data || []).filter((hw) => {
    const due = new Date(hw.due_date);
    const now = new Date();
    if (filter === "overdue") return due < now;
    if (filter === "pending") return due >= now;
    return true;
  });

  // ── counts ──
  const overdueCount = (data || []).filter(
    (hw) => new Date(hw.due_date) < new Date(),
  ).length;
  const pendingCount = (data || []).filter(
    (hw) => new Date(hw.due_date) >= new Date(),
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2 flex-wrap">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
          <BookOpen size={15} className="text-violet-600" />
        </div>
        <h2 className="font-bold text-gray-900 text-sm">Homework</h2>

        {data && data.length > 0 && (
          <span className="ml-auto text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
            {data.length}
          </span>
        )}

        {/* Filter tabs */}
        {data && data.length > 0 && (
          <div className="w-full flex gap-1.5 mt-1">
            {[
              { key: "all", label: "All", count: data.length },
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "overdue", label: "Overdue", count: overdueCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors
                  ${
                    filter === tab.key
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1 ${filter === tab.key ? "opacity-80" : "text-gray-400"}`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            {error}
            <button
              onClick={load}
              className="text-red-700 font-semibold hover:underline text-xs ml-4"
            >
              Retry
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No homework assigned yet</p>
            <p className="text-xs mt-1">You&apos;re all caught up!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No {filter} homework</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((hw) => {
              const isOpen = expanded === hw.id;
              const due = getDueBadge(hw.due_date);
              const sc = subjectColor(hw.subject);
              const isOverdue = new Date(hw.due_date) < new Date();

              return (
                <div
                  key={hw.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden
                    ${
                      isOverdue
                        ? "border-red-200 bg-red-50/20"
                        : "border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/20"
                    }`}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : hw.id)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
                  >
                    {/* Left icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${sc.icon}`}
                    >
                      <BookOpen size={14} className={sc.text} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                        >
                          {hw.subject}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${due.bg} ${due.text}`}
                        >
                          {due.label}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {hw.title}
                      </p>

                      <div className="flex items-center gap-1 mt-0.5">
                        <Calendar size={10} className="text-gray-400" />
                        <p className="text-xs text-gray-400">
                          Due:{" "}
                          {new Date(hw.due_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {hw.teacher_name && ` · ${hw.teacher_name}`}
                        </p>
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`flex-shrink-0 mt-1 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                      <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {hw.description || (
                          <span className="text-gray-400 italic">
                            No additional description provided.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
