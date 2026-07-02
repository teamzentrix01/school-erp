"use client";

import { useState, useEffect, useCallback } from "react";
import TeacherSidebar from "@/components/TeacherSidebar";
import { apiFetch as request } from "@/lib/api";
import { Clock, BookOpen } from "lucide-react";

const apiFetch = (path) => request(`/teacher${path}`);

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_COLOR = {
  Monday: {
    btn: "bg-emerald-500",
    light: "bg-emerald-50 border-emerald-100",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  Tuesday: {
    btn: "bg-blue-500",
    light: "bg-blue-50 border-blue-100",
    bar: "bg-blue-500",
    text: "text-blue-600",
  },
  Wednesday: {
    btn: "bg-violet-500",
    light: "bg-violet-50 border-violet-100",
    bar: "bg-violet-500",
    text: "text-violet-600",
  },
  Thursday: {
    btn: "bg-amber-500",
    light: "bg-amber-50 border-amber-100",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  Friday: {
    btn: "bg-rose-500",
    light: "bg-rose-50 border-rose-100",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
  Saturday: {
    btn: "bg-slate-400",
    light: "bg-slate-50 border-slate-100",
    bar: "bg-slate-400",
    text: "text-slate-500",
  },
};

function Skeleton() {
  return <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />;
}

export default function TeacherLecturesPage() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayName = new Date().toLocaleDateString("en-IN", { weekday: "long" });
  const [activeDay, setActiveDay] = useState(
    DAYS.includes(todayName) ? todayName : "Monday",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/timetable");
      setTimetable(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load timetable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = timetable
      .filter((t) => t.day?.toLowerCase() === day.toLowerCase())
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    return acc;
  }, {});

  const c = DAY_COLOR[activeDay];

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Lectures</h1>
            <p className="text-sm text-gray-400">Weekly teaching schedule</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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

          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DAYS.map((day) => {
              const isActive = day === activeDay;
              const isToday = day === todayName;
              const cnt = grouped[day]?.length || 0;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    isActive
                      ? `${DAY_COLOR[day].btn} text-white border-transparent shadow-md`
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {day.slice(0, 3)}
                  {isToday && !isActive && (
                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block align-middle" />
                  )}
                  {cnt > 0 && (
                    <span
                      className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day header */}
          <div className="flex items-center gap-2">
            <BookOpen size={16} className={c.text} />
            <h2 className="font-bold text-gray-700 text-sm">
              {activeDay}
              {activeDay === todayName && (
                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  Today
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} />
              ))}
            </div>
          ) : grouped[activeDay]?.length > 0 ? (
            <div className="space-y-3">
              {grouped[activeDay].map((lec, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex ${c.light}`}
                >
                  <div className={`w-1.5 flex-shrink-0 ${c.bar}`} />
                  <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Time */}
                    <div className="flex items-center gap-2 flex-shrink-0 sm:w-36">
                      <Clock size={14} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {lec.start_time || "—"}
                        </p>
                        {lec.end_time && (
                          <p className="text-xs text-gray-400">
                            to {lec.end_time}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-gray-100 flex-shrink-0" />
                    {/* Subject & class */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base truncate">
                        {lec.subject || "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Class {lec.class_name || lec.className || "—"}
                        {lec.section ? ` – Section ${lec.section}` : ""}
                      </p>
                    </div>
                    {/* Badges */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {lec.period && (
                        <span className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-lg font-medium">
                          Period {lec.period}
                        </span>
                      )}
                      {lec.room && (
                        <span className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-lg font-medium">
                          Room {lec.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <div className="text-5xl mb-3">📚</div>
              <p className="text-sm font-semibold text-gray-500">
                No lectures on {activeDay}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeDay === todayName
                  ? "No teaching scheduled today."
                  : "No schedule added for this day."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
