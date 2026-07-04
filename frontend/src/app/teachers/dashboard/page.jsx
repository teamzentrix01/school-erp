"use client";

import { useState, useEffect, useCallback } from "react";
import TeacherSidebar from "@/components/TeacherSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import { apiFetch as request } from "@/lib/api";
import {
  BookOpen,
  Users,
  CalendarDays,
  GraduationCap,
  Phone,
  Mail,
  Bell,
  Pin,
  AlertCircle,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const apiFetch = (path) => request(`/teacher${path}`);

function getInitials(name = "") {
  const p = name.trim().split(" ").filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ── Shared UI ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}
      >
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {value}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Skeleton({ h = "h-20" }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

// ── NoticesSection ────────────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  General: { bg: "bg-gray-100", text: "text-gray-600" },
  Academic: { bg: "bg-blue-50", text: "text-blue-700" },
  Exam: { bg: "bg-violet-50", text: "text-violet-700" },
  Holiday: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Event: { bg: "bg-amber-50", text: "text-amber-700" },
  Urgent: { bg: "bg-red-50", text: "text-red-700" },
};

function NoticesSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/notices");
      setData(Array.isArray(res) ? res : []);
    } catch {
      setError("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Bell size={15} className="text-amber-600" />
        </div>
        <h2 className="font-bold text-gray-900 text-sm">Notices</h2>
        {data && data.length > 0 && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
            {data.length}
          </span>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton h="h-14" />
            <Skeleton h="h-14" />
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
          <div className="text-center py-8 text-gray-400">
            <Bell size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No notices for you right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((n) => {
              const cat = CATEGORY_STYLE[n.category] ?? CATEGORY_STYLE.General;
              const isOpen = expanded === n.id;
              const isUrgent = n.priority === "Urgent";
              return (
                <div
                  key={n.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden
                    ${
                      isUrgent
                        ? "border-red-200 bg-red-50/30"
                        : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/20"
                    }`}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : n.id)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                      ${isUrgent ? "bg-red-100" : n.is_pinned ? "bg-emerald-100" : "bg-gray-100"}`}
                    >
                      {isUrgent ? (
                        <AlertCircle size={15} className="text-red-600" />
                      ) : n.is_pinned ? (
                        <Pin size={15} className="text-emerald-600" />
                      ) : (
                        <Bell size={15} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {n.is_pinned && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-semibold">
                            📌 Pinned
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}
                        >
                          {n.category}
                        </span>
                        {n.priority && n.priority !== "Normal" && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                            ${isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {n.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {n.author ?? "Admin"} ·{" "}
                        {new Date(n.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
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
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                      <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {n.content}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, cl, st, tt] = await Promise.allSettled([
        apiFetch("/profile"),
        apiFetch("/classes"),
        apiFetch("/students"),
        apiFetch("/timetable"),
      ]);
      if (p.status === "fulfilled") {
        setProfile(p.value && typeof p.value === "object" ? p.value : null);
      }
      if (cl.status === "fulfilled")
        setClasses(Array.isArray(cl.value) ? cl.value : []);
      if (st.status === "fulfilled")
        setStudents(Array.isArray(st.value) ? st.value : []);
      if (tt.status === "fulfilled")
        setTimetable(Array.isArray(tt.value) ? tt.value : []);
      if ([p, cl, st, tt].some((result) => result.status === "rejected")) {
        setError("Some dashboard data could not be loaded. Please retry.");
      }
    } catch {
      setError("Failed to load dashboard. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date();
  const dayName = DAYS[today.getDay()];
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayLectures = timetable
    .filter((t) => t.day?.toLowerCase() === dayName.toLowerCase())
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const primaryClass = classes[0];
  const classStudents = students
    .filter((s) =>
      primaryClass
        ? s.class_id === primaryClass.id ||
          (s.class === primaryClass.grade && s.section === primaryClass.section)
        : false,
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <PortalTopbar role="teacher" onRefresh={load} />
        {/* Header */}
        <div className="hidden bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back
                {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}! 👋
              </h1>
              <p className="text-sm text-gray-400">{dateStr}</p>
            </div>

            {profile && (
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-100">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getInitials(profile.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 leading-tight">
                    {profile.name}
                  </p>
                  <p className="text-xs text-emerald-500">
                    {profile.teacher_type || "Teacher"}
                    {primaryClass
                      ? ` · Class ${primaryClass.grade}-${primaryClass.section}`
                      : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Welcome back
              {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-sm text-gray-400">{dateStr}</p>
          </div>
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

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={BookOpen}
              label="Today's Lectures"
              value={loading ? "…" : todayLectures.length}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatCard
              icon={Users}
              label="My Students"
              value={loading ? "…" : students.length}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatCard
              icon={GraduationCap}
              label="My Classes"
              value={loading ? "…" : classes.length}
              color="text-violet-600"
              bg="bg-violet-50"
            />
            <StatCard
              icon={CalendarDays}
              label="Day"
              value={loading ? "…" : dayName.slice(0, 3)}
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Profile card */}
            {/* Profile card */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  {profile?.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={profile.name}
                      className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {getInitials(profile?.name || "")}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-base leading-tight">
                      {profile?.name || "—"}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      {profile?.teacher_type || "Teacher"}
                    </p>
                    {primaryClass && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Class {primaryClass.grade}-{primaryClass.section}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact rows */}
                <div className="space-y-2.5">
                  {profile?.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail
                        size={14}
                        className="text-emerald-400 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-600 truncate">
                        {profile.email}
                      </span>
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone
                        size={14}
                        className="text-emerald-400 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-600">
                        {profile.phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Aadhaar section */}
                {/* Aadhaar Details */}
                {(profile?.aadhar_number || profile?.aadhar_image_url) && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Aadhaar Details
                    </p>
                    {profile.aadhar_number && (
                      <p className="text-sm font-mono text-gray-700 tracking-widest mb-2">
                        {profile.aadhar_number.replace(
                          /(\d{4})(\d{4})(\d{4})/,
                          "$1 $2 $3",
                        )}
                      </p>
                    )}
                    {profile.aadhar_image_url && (
                      <a
                        href={profile.aadhar_image_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={profile.aadhar_image_url}
                          alt="Aadhaar Card"
                          className="h-20 w-full object-cover rounded-xl border border-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Today's lectures */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 text-sm">
                    Today&apos;s Lectures
                  </h2>
                  <span className="text-xs text-gray-400">{dayName}</span>
                </div>
                {loading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton />
                    <Skeleton />
                  </div>
                ) : todayLectures.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {todayLectures.map((lec, i) => (
                      <div
                        key={i}
                        className="px-5 py-3 flex items-center gap-4"
                      >
                        <div className="w-16 text-center flex-shrink-0">
                          <p className="text-xs font-bold text-emerald-600">
                            {lec.start_time || "—"}
                          </p>
                          {lec.end_time && (
                            <p className="text-[10px] text-gray-400">
                              – {lec.end_time}
                            </p>
                          )}
                        </div>
                        <div className="w-0.5 h-8 bg-emerald-100 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {lec.subject || "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            Class {lec.class_name || lec.className || "—"}{" "}
                            {lec.section ? `· Sec ${lec.section}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {lec.period && (
                            <span className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                              P{lec.period}
                            </span>
                          )}
                          {lec.room && (
                            <span className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                              Rm {lec.room}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="text-sm font-medium text-gray-500">
                      No lectures today
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Enjoy your free day!
                    </p>
                  </div>
                )}
              </div>

              {/* Class students preview */}
              {primaryClass && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 text-sm">
                      Class {primaryClass.grade}-{primaryClass.section} Students
                    </h2>
                    <span className="text-xs text-gray-400">
                      {classStudents.length} students
                    </span>
                  </div>
                  {loading ? (
                    <div className="p-4 space-y-2">
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                    </div>
                  ) : classStudents.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {classStudents.slice(0, 5).map((s, i) => (
                        <div
                          key={s.id || i}
                          className="px-5 py-3 flex items-center gap-3"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                            {getInitials(s.name || "")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              Roll {s.roll_number}
                            </p>
                          </div>
                        </div>
                      ))}
                      {classStudents.length > 5 && (
                        <div className="px-5 py-3 text-center text-xs text-emerald-600 font-semibold">
                          +{classStudents.length - 5} more ·{" "}
                          <a href="/teachers/class" className="underline">
                            View all
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <div className="text-3xl mb-2">👥</div>
                      <p className="text-sm font-medium text-gray-500">
                        No students found
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ NOTICES — renders here */}
              <NoticesSection />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
