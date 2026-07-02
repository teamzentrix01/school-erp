"use client";

import { useState, useEffect, useCallback } from "react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";
import { CalendarDays, Clock } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_COLORS = {
  Monday: "bg-violet-500",
  Tuesday: "bg-blue-500",
  Wednesday: "bg-emerald-500",
  Thursday: "bg-amber-500",
  Friday: "bg-rose-500",
  Saturday: "bg-slate-400",
};

const DAY_LIGHT = {
  Monday: "bg-violet-50 border-violet-100 text-violet-700",
  Tuesday: "bg-blue-50 border-blue-100 text-blue-700",
  Wednesday: "bg-emerald-50 border-emerald-100 text-emerald-700",
  Thursday: "bg-amber-50 border-amber-100 text-amber-700",
  Friday: "bg-rose-50 border-rose-100 text-rose-700",
  Saturday: "bg-gray-50 border-gray-100 text-gray-600",
};

function SkeletonBlock() {
  return <div className="h-36 bg-gray-100 rounded-2xl animate-pulse" />;
}

export default function StudentTimetablePage() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().toLocaleDateString("en-IN", { weekday: "long" });
    return DAYS.includes(d) ? d : "Monday";
  });

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/student/timetable");
      setTimetable(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load timetable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Group by day
  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = timetable
      .filter((t) => t.day_of_week?.toLowerCase() === day.toLowerCase())
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    return acc;
  }, {});

  const todayName = new Date().toLocaleDateString("en-IN", { weekday: "long" });

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Timetable</h1>
            <p className="text-sm text-gray-400">Weekly class schedule</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {error}
              <button
                onClick={fetchTimetable}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {/* Day tab switcher */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {DAYS.map((day) => {
              const isToday = day === todayName;
              const isActive = day === activeDay;
              const count = grouped[day]?.length || 0;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    isActive
                      ? `${DAY_COLORS[day]} text-white border-transparent shadow-md`
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:text-gray-700"
                  }`}
                >
                  <span>{day.slice(0, 3)}</span>
                  {isToday && !isActive && (
                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-500 inline-block align-middle" />
                  )}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day header */}
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-gray-400" />
            <h2 className="font-bold text-gray-700 text-sm">
              {activeDay}
              {activeDay === todayName && (
                <span className="ml-2 text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                  Today
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <SkeletonBlock key={i} />
              ))}
            </div>
          ) : grouped[activeDay]?.length > 0 ? (
            <div className="space-y-3">
              {grouped[activeDay].map((cls, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex ${DAY_LIGHT[activeDay]}`}
                >
                  <div
                    className={`w-1.5 flex-shrink-0 ${DAY_COLORS[activeDay]}`}
                  />
                  <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Time */}
                    <div className="flex items-center gap-2 flex-shrink-0 sm:w-36">
                      <Clock size={14} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {cls.start_time || "—"}
                        </p>
                        {cls.end_time && (
                          <p className="text-xs text-gray-400">
                            to {cls.end_time}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:block w-px h-10 bg-gray-100 flex-shrink-0" />

                    {/* Subject */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base leading-tight truncate">
                        {cls.subject || cls.subject_name || "—"}
                      </p>
                      {cls.teacher_name && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cls.teacher_name}
                        </p>
                      )}
                    </div>

                    {/* Room / Period */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {cls.period && (
                        <span className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-lg font-medium">
                          Period {cls.period}
                        </span>
                      )}
                      {cls.room && (
                        <span className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-lg font-medium">
                          Room {cls.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-sm font-semibold text-gray-500">
                No classes on {activeDay}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeDay === todayName
                  ? "Enjoy your free day!"
                  : "No schedule added for this day."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
