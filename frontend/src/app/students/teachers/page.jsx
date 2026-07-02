"use client";

import { useState, useEffect, useCallback } from "react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";
import { Search, Mail, Phone, BookOpen } from "lucide-react";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

function getInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name = "") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function TeacherCard({ teacher }) {
  const name = teacher.name || teacher.teacher_name || "—";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Top accent strip */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-14 h-14 rounded-xl ${avatarColor(name)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}
          >
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-base leading-tight truncate">
              {name}
            </p>
            {teacher.designation && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {teacher.designation}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {(teacher.subject || teacher.subject_name) && (
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate font-medium">
                {teacher.subject || teacher.subject_name}
              </span>
            </div>
          )}
          {teacher.email && (
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-gray-400 flex-shrink-0" />
              <a
                href={`mailto:${teacher.email}`}
                className="text-xs text-violet-500 hover:underline truncate"
              >
                {teacher.email}
              </a>
            </div>
          )}
          {teacher.phone && (
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500">{teacher.phone}</span>
            </div>
          )}
        </div>

        {teacher.is_class_teacher && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
            ⭐ Class Teacher
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1.5 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-3/4 animate-pulse" />
      </div>
    </div>
  );
}

export default function StudentTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/student/teachers");
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load teachers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase();
    const name = (t.name || t.teacher_name || "").toLowerCase();
    const subj = (t.subject || t.subject_name || "").toLowerCase();
    return !q || name.includes(q) || subj.includes(q);
  });

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Teachers</h1>
              <p className="text-sm text-gray-400">
                Teachers assigned to your class
              </p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-60">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or subject…"
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {error}
              <button
                onClick={fetchTeachers}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <p className="text-xs text-gray-400 mb-4">
              {filtered.length} teacher{filtered.length !== 1 ? "s" : ""} found
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((t, i) => (
                <TeacherCard key={t.id || i} teacher={t} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="text-5xl mb-3">👨‍🏫</div>
              <p className="text-sm font-semibold text-gray-500">
                {search
                  ? "No teachers match your search"
                  : "No teachers assigned yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {search
                  ? "Try a different name or subject"
                  : "Your class teacher will be assigned soon"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
