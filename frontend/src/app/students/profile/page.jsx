"use client";

import { useState, useEffect, useCallback } from "react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Shield,
  Hash,
  CreditCard,
  FileText,
  CheckCircle2,
} from "lucide-react";

function getInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/60">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="p-5 space-y-0">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-violet-500" />
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

function SkeletonBlock({ h = "h-48" }) {
  return <div className={`${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

export default function StudentProfilePage() {
  const [student, setStudent] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, documentData] = await Promise.all([
        apiFetch("/student/profile"),
        apiFetch("/documents/student"),
      ]);
      setStudent(data && typeof data === "object" ? data : null);
      setDocuments(Array.isArray(documentData) ? documentData : []);
    } catch {
      setError("Could not load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
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
                onClick={fetchProfile}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              <SkeletonBlock h="h-36" />
              <SkeletonBlock h="h-56" />
              <SkeletonBlock h="h-40" />
            </div>
          ) : student ? (
            <div className="max-w-3xl mx-auto space-y-5">
              {/* Hero card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-violet-500 to-purple-700 relative">
                  <div className="absolute -bottom-8 left-6">
                    <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
                      {student.photo_url ? (
                        <img
                          src={getMediaUrl(student.photo_url)}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white flex items-center justify-center text-2xl font-bold text-violet-600">
                          {getInitials(student.name)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-12 pb-5 px-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {student.name}
                  </h2>
                  <p className="text-sm text-violet-600 font-medium mt-0.5">
                    {student.class} – Section {student.section}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {student.student_id && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full border border-violet-100 font-medium">
                        <Hash size={11} /> {student.student_id}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">
                      Roll No. {student.roll_number}
                    </span>
                    {student.gender && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 px-3 py-1 rounded-full border border-gray-100 font-medium">
                        {student.gender}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <Section title="Personal Details">
                <Row icon={Mail} label="Email Address" value={student.email} />
                <Row icon={Phone} label="Phone Number" value={student.phone} />
                <Row
                  icon={Calendar}
                  label="Date of Birth"
                  value={
                    student.date_of_birth
                      ? new Date(student.date_of_birth).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "long", year: "numeric" },
                        )
                      : null
                  }
                />
                <Row icon={User} label="Gender" value={student.gender} />
                <Row icon={MapPin} label="Address" value={student.address} />

                {/* ─── Aadhaar Details ─── */}
                {student.aadhar_number && (
                  <Row
                    icon={CreditCard}
                    label="Aadhaar Number"
                    value={student.aadhar_number.replace(
                      /(\d{4})(\d{4})(\d{4})/,
                      "$1 $2 $3",
                    )}
                  />
                )}
                {student.aadhar_image_url && (
                  <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CreditCard size={13} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 block mb-2">
                        Aadhaar Card Image
                      </span>
                      <a
                        href={getMediaUrl(student.aadhar_image_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={getMediaUrl(student.aadhar_image_url)}
                          alt="Aadhaar Card"
                          className="h-28 rounded-xl border border-gray-200 object-cover shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                        />
                        <p className="text-xs text-violet-500 mt-1 hover:underline">
                          Click to view full image
                        </p>
                      </a>
                    </div>
                  </div>
                )}
              </Section>

              {/* Academic Details */}
              <Section title="Academic Details">
                <Row
                  icon={BookOpen}
                  label="Class"
                  value={student.class ? `Class ${student.class}` : null}
                />
                <Row icon={Shield} label="Section" value={student.section} />
                <Row
                  icon={User}
                  label="Class Teacher"
                  value={student.class_teacher}
                />
                <Row
                  icon={Hash}
                  label="Roll Number"
                  value={student.roll_number}
                />
                {student.student_id && (
                  <Row
                    icon={Hash}
                    label="Student ID"
                    value={student.student_id}
                  />
                )}
              </Section>

              {/* Parent / Guardian */}
              <Section title="Parent / Guardian">
                <Row
                  icon={User}
                  label="Guardian Name"
                  value={student.guardian_name}
                />
                <Row
                  icon={Phone}
                  label="Guardian Contact"
                  value={student.guardian_phone}
                />
              </Section>

              <Section title="Uploaded Documents">
                {documents.length ? (
                  documents.map((document) => (
                    <a
                      key={document.id}
                      href={getMediaUrl(document.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 border-b border-orange-100 py-3 last:border-0"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                        <FileText size={16} className="text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {document.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {document.document_type}
                          {document.document_number
                            ? ` | ${document.document_number}`
                            : ""}
                        </p>
                      </div>
                      {document.verified && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      )}
                    </a>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No documents uploaded.
                  </p>
                )}
              </Section>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">🎓</div>
              <p className="font-medium">No profile data found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
