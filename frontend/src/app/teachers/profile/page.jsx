"use client";

import { useState, useEffect, useCallback } from "react";
import TeacherSidebar from "@/components/TeacherSidebar";
import { apiFetch as request } from "@/lib/api";
import {
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Users,
  Hash,
  Award,
} from "lucide-react";

const apiFetch = (path) => request(`/teacher${path}`);

function getInitials(name = "") {
  const p = name.trim().split(" ").filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/60">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-sm text-gray-800 font-medium sm:text-right">
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

function Skeleton({ h = "h-48" }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

const TYPE_BADGE = {
  "Class Teacher": "bg-blue-50 text-blue-700 border-blue-100",
  "Subject Teacher": "bg-violet-50 text-violet-700 border-violet-100",
  Both: "bg-teal-50 text-teal-700 border-teal-100",
};

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, cl] = await Promise.allSettled([
        apiFetch("/profile"),
        apiFetch("/classes"),
      ]);
      if (p.status === "fulfilled") {
        setProfile(p.value && typeof p.value === "object" ? p.value : null);
        // Try pre-parsed array first (new API shape), fallback to JSON string
        if (p.value?.subjectAssignments?.length) {
          setSubjects(p.value.subjectAssignments);
        } else if (p.value?.subject_assignments) {
          try {
            setSubjects(JSON.parse(p.value.subject_assignments));
          } catch {}
        }
      }
      if (cl.status === "fulfilled") {
        setClasses(Array.isArray(cl.value) ? cl.value : []);
      }
      if (p.status === "rejected" || cl.status === "rejected") {
        setError("Some profile data could not be loaded. Please retry.");
      }
    } catch {
      setError("Could not load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const typeClass =
    TYPE_BADGE[profile?.teacher_type] || TYPE_BADGE["Subject Teacher"];

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-400">
              Your personal and academic information
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {error}
              <button
                onClick={load}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <Skeleton h="h-40" />
              <Skeleton h="h-56" />
              <Skeleton h="h-40" />
            </div>
          ) : profile ? (
            <div className="max-w-3xl mx-auto space-y-5">
              {/* Hero */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-700 relative">
                  <div className="absolute -bottom-8 left-6">
                    {profile.profile_picture ? (
                      <img
                        src={profile.profile_picture}
                        alt={profile.name}
                        className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-emerald-600">
                        {getInitials(profile.name)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-12 pb-5 px-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {profile.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold ${typeClass}`}
                    >
                      {profile.teacher_type === "Class Teacher" && (
                        <GraduationCap size={11} />
                      )}
                      {profile.teacher_type === "Subject Teacher" && (
                        <BookOpen size={11} />
                      )}
                      {profile.teacher_type === "Both" && <Users size={11} />}
                      {profile.teacher_type || "Teacher"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold ${
                        profile.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-gray-50 text-gray-500 border-gray-100"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${profile.status === "Active" ? "bg-emerald-500" : "bg-gray-400"}`}
                      />
                      {profile.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <Section title="Contact Details">
                <Row icon={Mail} label="Email Address" value={profile.email} />
                <Row icon={Phone} label="Phone Number" value={profile.phone} />
              </Section>

              {/* Classes */}
              {(profile.teacher_type === "Class Teacher" ||
                profile.teacher_type === "Both") && (
                <Section title="Class Teacher Assignment">
                  {classes.length > 0 ? (
                    <div className="space-y-0">
                      {classes.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <GraduationCap
                              size={13}
                              className="text-blue-500"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between gap-0.5">
                            <span className="text-xs text-gray-400">Class</span>
                            <span className="text-sm font-semibold text-gray-800">
                              {c.grade || c.class_name} – Section {c.section}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">
                      No class assigned yet.
                    </p>
                  )}
                </Section>
              )}

              {/* Subject assignments */}
              {(profile.teacher_type === "Subject Teacher" ||
                profile.teacher_type === "Both") && (
                <Section title="Subject Assignments">
                  {subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-700"
                        >
                          <BookOpen size={11} />
                          {s.subject} · Class {s.className}-{s.section}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">
                      No subject assignments yet.
                    </p>
                  )}
                </Section>
              )}

              {/* Aadhaar Details */}
              {(profile.aadhar_number || profile.aadhar_image_url) && (
                <Section title="Aadhaar Details">
                  {profile.aadhar_number && (
                    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Hash size={13} className="text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                        <span className="text-xs text-gray-400">
                          Aadhaar Number
                        </span>
                        <span className="text-sm text-gray-800 font-medium font-mono tracking-widest">
                          {profile.aadhar_number.replace(
                            /(\d{4})(\d{4})(\d{4})/,
                            "$1 $2 $3",
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {profile.aadhar_image_url && (
                    <div className={profile.aadhar_number ? "pt-3" : ""}>
                      <p className="text-xs text-gray-400 mb-2">
                        Aadhaar Card Image
                      </p>
                      <a
                        href={profile.aadhar_image_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={profile.aadhar_image_url}
                          alt="Aadhaar Card"
                          className="h-28 rounded-xl border border-gray-100 object-cover hover:opacity-80 transition-opacity cursor-pointer shadow-sm"
                        />
                      </a>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Click to view full image
                      </p>
                    </div>
                  )}
                </Section>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-gray-400">
              <div className="text-5xl mb-3">👨‍🏫</div>
              <p className="font-medium">No profile data found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
