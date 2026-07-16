"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Users,
  UserCheck,
  UserMinus,
  Search,
  Download,
  Plus,
  X,
  Bell,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Eye,
  Pencil,
  ChevronsUpDown,
  Upload,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Trash2,
  Phone,
  Mail,
  Lock,
  Camera,
  Check,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ["All Status", "Active", "On Leave", "Inactive"];
const EXPERIENCE_RANGES = [
  "Any Experience",
  "0–3 yrs",
  "4–7 yrs",
  "8–12 yrs",
  "12+ yrs",
];
const INIT_FILTERS = {
  department: "All Departments",
  subject: "All Subjects",
  status: "All Status",
  experience: "Any Experience",
  type: "All Types",
};
const TEACHER_TYPES = ["All Types", "Class Teacher", "Subject Teacher", "Both"];
const CLASS_NAMES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];
const SECTIONS = ["A", "B", "C", "D", "E"];

// ── Auth helper ───────────────────────────────────────────────────────────────
const getToken = () => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(^| )token=([^;]+)/);
  return match ? match[2] : null;
};

function expMatch(exp, range) {
  if (range === "Any Experience") return true;
  if (range === "0–3 yrs") return exp <= 3;
  if (range === "4–7 yrs") return exp >= 4 && exp <= 7;
  if (range === "8–12 yrs") return exp >= 8 && exp <= 12;
  if (range === "12+ yrs") return exp > 12;
  return true;
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
      dot: "bg-emerald-500",
    },
    "On Leave": {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
      dot: "bg-amber-500",
    },
    Inactive: {
      bg: "bg-gray-100",
      text: "text-gray-500",
      ring: "ring-gray-200",
      dot: "bg-gray-400",
    },
  };
  const s = map[status] ?? map.Inactive;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────
// TYPE BADGE
// ─────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    "Class Teacher": {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: GraduationCap,
    },
    "Subject Teacher": {
      bg: "bg-violet-50",
      text: "text-violet-700",
      icon: BookOpen,
    },
    Both: { bg: "bg-teal-50", text: "text-teal-700", icon: Users },
  };
  const s = map[type] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: Users,
  };
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${s.bg} ${s.text}`}
    >
      <Icon size={11} />
      {type}
    </span>
  );
}

// ─────────────────────────────────────────────
// ADD TEACHER MODAL
// ─────────────────────────────────────────────
const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  password: "",
  teacherType: "Subject Teacher",
  classTeacherClass: "",
  classTeacherSection: "",
  subjectAssignments: [{ subject: "", className: "", section: "" }],
  profilePicture: null,
  profilePicturePreview: null,
  aadharNumber: "",
  aadharImageUrl: "",
  status: "Active",
};

const cleanPhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);

function SubjectAssignmentRow({
  idx,
  assignment,
  onChange,
  onRemove,
  canRemove,
  subjectsList,
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Subject
          </label>
          <input
            value={assignment.subject}
            onChange={(e) => onChange(idx, "subject", e.target.value)}
            placeholder="e.g. Physics"
            list={`subjects-list-${idx}`}
            className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 bg-white"
          />
          <datalist id={`subjects-list-${idx}`}>
            {subjectsList.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Class
          </label>
          <select
            value={assignment.className}
            onChange={(e) => onChange(idx, "className", e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 bg-white appearance-none"
          >
            <option value="">Select</option>
            {CLASS_NAMES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Section
          </label>
          <select
            value={assignment.section}
            onChange={(e) => onChange(idx, "section", e.target.value)}
            className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 bg-white appearance-none"
          >
            <option value="">Select</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="mt-5 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function AddTeacherModal({ onClose, onSaved, subjectsList, classesMeta }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();
  const aadharFileRef = useRef();
  const [aadharFile, setAadharFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);

  const handleAadhar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Aadhaar image must be under 5MB");
      return;
    }
    setAadharFile(file);
    setAadharPreview(URL.createObjectURL(file));
    set("aadharFile", file);
  };

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("profilePicturePreview", ev.target.result);
    reader.readAsDataURL(file);
    set("profilePicture", file);
  };

  const updateSubjRow = (idx, field, val) => {
    const rows = [...form.subjectAssignments];
    rows[idx] = { ...rows[idx], [field]: val };
    set("subjectAssignments", rows);
  };

  const addSubjRow = () =>
    set("subjectAssignments", [
      ...form.subjectAssignments,
      { subject: "", className: "", section: "" },
    ]);

  const removeSubjRow = (idx) =>
    set(
      "subjectAssignments",
      form.subjectAssignments.filter((_, i) => i !== idx),
    );

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.password.trim()) e.password = "Password is required";
    if (!/^\d{10}$/.test(cleanPhone(form.phone)))
      e.phone = "Phone must be exactly 10 digits";
    if (!form.aadharNumber?.trim())
      e.aadharNumber = "Aadhaar number is required";
    else if (!/^\d{12}$/.test(form.aadharNumber.replace(/\s/g, "")))
      e.aadharNumber = "Must be exactly 12 digits";
    if (!aadharFile) e.aadharImage = "Aadhaar card image is required";
    if (
      (form.teacherType === "Class Teacher" || form.teacherType === "Both") &&
      (!form.classTeacherClass || !form.classTeacherSection)
    )
      e.classTeacher = "Select class and section for class teacher";
    if (form.teacherType === "Subject Teacher" || form.teacherType === "Both") {
      const incomplete = form.subjectAssignments.some(
        (r) => !r.subject || !r.className || !r.section,
      );
      if (incomplete) e.subjects = "All subject rows must be complete";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("phone", form.phone);
      fd.append("teacherType", form.teacherType);
      fd.append("status", form.status);
      fd.append("aadhar_number", form.aadharNumber.replace(/\s/g, ""));

      if (form.teacherType === "Class Teacher" || form.teacherType === "Both") {
        fd.append("classTeacherClass", form.classTeacherClass);
        fd.append("classTeacherSection", form.classTeacherSection);
      }
      if (
        form.teacherType === "Subject Teacher" ||
        form.teacherType === "Both"
      ) {
        fd.append(
          "subjectAssignments",
          JSON.stringify(form.subjectAssignments),
        );
      }
      if (form.profilePicture) fd.append("profilePicture", form.profilePicture);

      // ── Step 1: Create the teacher ──────────────────────────────────────────
      const res = await fetch(`${API_BASE}/api/admin/teachers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      // ── Step 2: Upload Aadhaar image after teacher is created ───────────────
      if (aadharFile && data.id) {
        const aadharFd = new FormData();
        aadharFd.append("aadhar_image", aadharFile);
        await fetch(`${API_BASE}/api/admin/teachers/${data.id}/aadhar-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: aadharFd,
        });
      }

      // ── Step 3: Done ────────────────────────────────────────────────────────
      onSaved(data);
      onClose();
    } catch (err) {
      setErrors((p) => ({ ...p, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const showClassSection =
    form.teacherType === "Class Teacher" || form.teacherType === "Both";
  const showSubjects =
    form.teacherType === "Subject Teacher" || form.teacherType === "Both";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-sm">
      {/* Slide-in panel */}
      <div className="h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Teacher</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fill in teacher details to create an account
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Profile picture */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-400 transition-colors group"
            >
              {form.profilePicturePreview ? (
                <img
                  src={form.profilePicturePreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-blue-500 transition-colors">
                  <Camera size={24} />
                  <span className="text-[10px] mt-1 font-medium">Photo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload size={18} className="text-white" />
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
            <p className="text-[11px] text-gray-400">
              Click to upload profile photo (optional)
            </p>
          </div>

          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Priya Sharma"
                className={`w-full h-10 px-3 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all ${errors.name ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Phone size={13} /> Phone Number{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", cleanPhone(e.target.value))}
                inputMode="numeric"
                maxLength={10}
                placeholder="+91 98765 43210"
                type="tel"
                className={`w-full h-10 px-3 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all ${errors.phone ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Login credentials */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Login Credentials
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} /> Email Address{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="teacher@school.edu"
                type="email"
                className={`w-full h-10 px-3 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all ${errors.email ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Lock size={13} /> Password{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Minimum 8 characters"
                type="password"
                className={`w-full h-10 px-3 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all ${errors.password ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Teacher Type */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Teacher Role
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {["Class Teacher", "Subject Teacher", "Both"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("teacherType", type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.teacherType === type
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {type === "Class Teacher" && <GraduationCap size={18} />}
                  {type === "Subject Teacher" && <BookOpen size={18} />}
                  {type === "Both" && <Users size={18} />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Class Teacher section */}
          {showClassSection && (
            <div className="space-y-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
                <GraduationCap size={13} /> Class Teacher Assignment
              </h3>
              {errors.classTeacher && (
                <p className="text-xs text-red-500">{errors.classTeacher}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.classTeacherClass}
                    onChange={(e) => set("classTeacherClass", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 appearance-none"
                  >
                    <option value="">Select Class</option>
                    {CLASS_NAMES.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.classTeacherSection}
                    onChange={(e) => set("classTeacherSection", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 appearance-none"
                  >
                    <option value="">Select Section</option>
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Subject Teacher assignments */}
          {showSubjects && (
            <div className="space-y-3 p-4 bg-violet-50/60 rounded-2xl border border-violet-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-violet-600 flex items-center gap-1.5">
                  <BookOpen size={13} /> Subject Assignments
                </h3>
                <button
                  type="button"
                  onClick={addSubjRow}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                >
                  <Plus size={13} /> Add Row
                </button>
              </div>
              {errors.subjects && (
                <p className="text-xs text-red-500">{errors.subjects}</p>
              )}
              <div className="space-y-2">
                {form.subjectAssignments.map((row, idx) => (
                  <SubjectAssignmentRow
                    key={idx}
                    idx={idx}
                    assignment={row}
                    onChange={updateSubjRow}
                    onRemove={removeSubjRow}
                    canRemove={form.subjectAssignments.length > 1}
                    subjectsList={subjectsList}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Aadhaar Number */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Aadhaar Details
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aadhaar Card Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.aadharNumber}
                onChange={(e) => {
                  const val = e.target.value
                    .replace(/[^\d\s]/g, "")
                    .slice(0, 14);
                  set("aadharNumber", val);
                }}
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                className={`w-full h-10 px-3 rounded-xl border text-sm font-mono tracking-widest
        focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400
        ${errors.aadharNumber ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.aadharNumber && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.aadharNumber}
                </p>
              )}
            </div>

            {/* Aadhaar Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aadhaar Card Image <span className="text-red-500">*</span>
              </label>
              <div className="flex items-start gap-4">
                {aadharPreview && (
                  <img
                    src={aadharPreview}
                    alt="Aadhaar"
                    className="h-24 rounded-xl border border-gray-200 object-cover shadow-sm"
                  />
                )}
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <Upload size={14} />
                    {aadharPreview ? "Change Image" : "Upload Aadhaar"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleAadhar}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, WebP or PDF · Max 5MB
                  </p>
                  {aadharFile && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {aadharFile.name}
                    </p>
                  )}
                  {errors.aadharImage && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.aadharImage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Status
            </h3>
            <div className="flex gap-2">
              {["Active", "Inactive"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    form.status === s
                      ? s === "Active"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-gray-400 bg-gray-100 text-gray-600"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {form.status === s && <Check size={11} />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {errors.submit}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Plus size={15} /> Add Teacher
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EDIT TEACHER MODAL
// ─────────────────────────────────────────────
function EditTeacherModal({
  teacher,
  onClose,
  onSaved,
  subjectsList,
  classesMeta,
}) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  const aadharFileRef = useRef();
  const [aadharFile, setAadharFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const handleAadhar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Aadhaar image must be under 5MB");
      return;
    }
    setAadharFile(file);
    setAadharPreview(URL.createObjectURL(file));
  };

  // Initialize form when teacher data is available
  useEffect(() => {
    if (teacher) {
      setForm({
        id: teacher.dbId || teacher.id,
        employeeId: teacher.id,
        name: teacher.name || "",
        phone: teacher.phone || "",
        email: teacher.email || "",
        teacherType: teacher.teacherType || "Subject Teacher",
        classTeacherClass: teacher.classTeacherClass || "",
        classTeacherSection: teacher.classTeacherSection || "",
        subjectAssignments: teacher.subjectAssignments?.length
          ? teacher.subjectAssignments
          : [{ subject: "", className: "", section: "" }],
        profilePicture: null,
        profilePicturePreview: teacher.profilePicture || null,
        status: teacher.status || "Active",
        existingProfilePicture: teacher.profilePicture || null,
        aadharNumber: teacher.aadharNumber || "",
        aadharImageUrl: teacher.aadharImageUrl || "",
      });
    }
  }, [teacher]);

  if (!form) return null;

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("profilePicturePreview", ev.target.result);
    reader.readAsDataURL(file);
    set("profilePicture", file);
  };

  const updateSubjRow = (idx, field, val) => {
    const rows = [...form.subjectAssignments];
    rows[idx] = { ...rows[idx], [field]: val };
    set("subjectAssignments", rows);
  };

  const addSubjRow = () =>
    set("subjectAssignments", [
      ...form.subjectAssignments,
      { subject: "", className: "", section: "" },
    ]);

  const removeSubjRow = (idx) =>
    set(
      "subjectAssignments",
      form.subjectAssignments.filter((_, i) => i !== idx),
    );

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!/^\d{10}$/.test(cleanPhone(form.phone)))
      e.phone = "Phone must be exactly 10 digits";
    if (
      (form.teacherType === "Class Teacher" || form.teacherType === "Both") &&
      (!form.classTeacherClass || !form.classTeacherSection)
    )
      e.classTeacher = "Select class and section for class teacher";
    if (form.teacherType === "Subject Teacher" || form.teacherType === "Both") {
      const incomplete = form.subjectAssignments.some(
        (r) => !r.subject || !r.className || !r.section,
      );
      if (incomplete) e.subjects = "All subject rows must be complete";
    }
    // ── Aadhaar validation ───────────────────────────────────────────────────
    if (
      form.aadharNumber &&
      !/^\d{12}$/.test(form.aadharNumber.replace(/\s/g, ""))
    ) {
      e.aadharNumber = "Aadhaar number must be exactly 12 digits";
    }
    // ────────────────────────────────────────────────────────────────────────
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("teacherType", form.teacherType);
      fd.append("status", form.status);

      // ── Aadhaar number ───────────────────────────────────────────────────
      if (form.aadharNumber) {
        fd.append("aadhar_number", form.aadharNumber.replace(/\s/g, ""));
      }

      if (form.teacherType === "Class Teacher" || form.teacherType === "Both") {
        fd.append("classTeacherClass", form.classTeacherClass);
        fd.append("classTeacherSection", form.classTeacherSection);
      }
      if (
        form.teacherType === "Subject Teacher" ||
        form.teacherType === "Both"
      ) {
        fd.append(
          "subjectAssignments",
          JSON.stringify(form.subjectAssignments),
        );
      }
      if (form.profilePicture) {
        fd.append("profilePicture", form.profilePicture);
      }
      if (!form.profilePicture && form.existingProfilePicture) {
        fd.append("existingProfilePicture", form.existingProfilePicture);
      }
      if (form.newPassword) {
        fd.append("password", form.newPassword);
      }

      // ── Step 1: Update teacher ───────────────────────────────────────────
      const res = await fetch(`${API_BASE}/api/admin/teachers/${form.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      // ── Step 2: Upload new Aadhaar image if changed ──────────────────────
      if (aadharFile && form.id) {
        const aadharFd = new FormData();
        aadharFd.append("aadhar_image", aadharFile);
        const aadharRes = await fetch(
          `${API_BASE}/api/admin/teachers/${form.id}/aadhar-image`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: aadharFd,
          },
        );
        const aadharData = await aadharRes.json().catch(() => ({}));
        if (!aadharRes.ok) {
          throw new Error(
            aadharData.message || "Teacher updated, but Aadhaar upload failed",
          );
        }
      }

      // ── Step 3: Done ─────────────────────────────────────────────────────
      onSaved(data);
      onClose();
    } catch (err) {
      setErrors((p) => ({ ...p, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const showClassSection =
    form.teacherType === "Class Teacher" || form.teacherType === "Both";
  const showSubjects =
    form.teacherType === "Subject Teacher" || form.teacherType === "Both";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Teacher</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Update teacher details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Profile picture - same as add modal */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-400 transition-colors group"
            >
              {form.profilePicturePreview ? (
                <img
                  src={form.profilePicturePreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-blue-500">
                  <Camera size={24} />
                  <span className="text-[10px] mt-1 font-medium">Photo</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
            <p className="text-[11px] text-gray-400">
              Click to change profile photo
            </p>
          </div>

          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Basic Information
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={`w-full h-10 px-3 rounded-xl border text-sm ${errors.name ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", cleanPhone(e.target.value))}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={`w-full h-10 px-3 rounded-xl border text-sm ${errors.phone ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Email (read-only for edit) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Email Address
            </h3>
            <input
              value={form.email}
              disabled
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
            />
            <p className="text-[10px] text-gray-400">Email cannot be changed</p>
          </div>

          {/* Teacher Type */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Teacher Role
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {["Class Teacher", "Subject Teacher", "Both"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("teacherType", type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${form.teacherType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"}`}
                >
                  {type === "Class Teacher" && <GraduationCap size={18} />}
                  {type === "Subject Teacher" && <BookOpen size={18} />}
                  {type === "Both" && <Users size={18} />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Class Teacher section */}
          {showClassSection && (
            <div className="space-y-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Class Teacher Assignment
              </h3>
              {errors.classTeacher && (
                <p className="text-xs text-red-500">{errors.classTeacher}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Class
                  </label>
                  <select
                    value={form.classTeacherClass}
                    onChange={(e) => set("classTeacherClass", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm"
                  >
                    <option value="">Select Class</option>
                    {CLASS_NAMES.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Section
                  </label>
                  <select
                    value={form.classTeacherSection}
                    onChange={(e) => set("classTeacherSection", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm"
                  >
                    <option value="">Select Section</option>
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Subject assignments */}
          {showSubjects && (
            <div className="space-y-3 p-4 bg-violet-50/60 rounded-2xl border border-violet-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-violet-600">
                  Subject Assignments
                </h3>
                <button
                  type="button"
                  onClick={addSubjRow}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600"
                >
                  <Plus size={13} /> Add Row
                </button>
              </div>
              {errors.subjects && (
                <p className="text-xs text-red-500">{errors.subjects}</p>
              )}
              <div className="space-y-2">
                {form.subjectAssignments.map((row, idx) => (
                  <SubjectAssignmentRow
                    key={idx}
                    idx={idx}
                    assignment={row}
                    onChange={updateSubjRow}
                    onRemove={removeSubjRow}
                    canRemove={form.subjectAssignments.length > 1}
                    subjectsList={subjectsList}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Aadhaar Details */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Aadhaar Details
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aadhaar Card Number
              </label>
              <input
                type="text"
                value={form.aadharNumber}
                onChange={(e) => {
                  const val = e.target.value
                    .replace(/[^\d\s]/g, "")
                    .slice(0, 14);
                  set("aadharNumber", val);
                }}
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                className={`w-full h-10 px-3 rounded-xl border text-sm font-mono tracking-widest
        focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400
        ${errors.aadharNumber ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.aadharNumber && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.aadharNumber}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aadhaar Card Image
              </label>
              <div className="flex items-start gap-4">
                {(aadharPreview || form.aadharImageUrl) && (
                  <img
                    src={aadharPreview || form.aadharImageUrl}
                    alt="Aadhaar"
                    className="h-24 rounded-xl border border-gray-200 object-cover shadow-sm"
                  />
                )}
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <Upload size={14} />
                    {aadharPreview || form.aadharImageUrl
                      ? "Change Image"
                      : "Upload Aadhaar"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleAadhar}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, WebP or PDF · Max 5MB
                  </p>
                  {aadharFile && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {aadharFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Status
            </h3>
            <div className="flex gap-2">
              {["Active", "Inactive", "On Leave"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${form.status === s ? (s === "Active" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-400 bg-gray-100 text-gray-600") : "border-gray-200 text-gray-400"}`}
                >
                  {form.status === s && (
                    <Check size={11} className="inline mr-1" />
                  )}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Optional password change */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Change Password (Optional)
            </h3>
            <input
              type="password"
              value={form.newPassword || ""}
              onChange={(e) => set("newPassword", e.target.value)}
              placeholder="Enter new password to change"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
            />
            <p className="text-[10px] text-gray-400">
              Leave blank to keep current password
            </p>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {errors.submit}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving…
              </>
            ) : (
              <>Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TEACHER TABLE  (desktop)
// ─────────────────────────────────────────────
const TABLE_COLS = ["Teacher", "ID", "Type", "Assignment", "Status", "Actions"];

function TeacherTable({
  teachers,
  selected,
  onSelect,
  onSelectAll,
  onDelete,
  onEdit,
  onView,
}) {
  const allSelected =
    teachers.length > 0 && selected.length === teachers.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll(teachers.map((t) => t.id))}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              </th>
              {TABLE_COLS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {!["Actions", "Type", "Assignment", "Status"].includes(
                      col,
                    ) && <ChevronsUpDown size={11} className="text-gray-300" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  <p className="text-base font-medium">No teachers found</p>
                  <p className="text-sm mt-1">
                    Try adjusting your filters or search
                  </p>
                </td>
              </tr>
            ) : (
              teachers.map((t) => {
                const isSel = selected.includes(t.id);
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`group transition-colors duration-150 cursor-pointer ${
                      isSel ? "bg-blue-50/60" : "hover:bg-gray-50/80"
                    }`}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => onSelect(t.id)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {t.profilePicture ? (
                          <img
                            src={t.profilePicture}
                            alt={t.name}
                            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${t.avatarColor}`}
                          >
                            {t.avatar}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800 whitespace-nowrap">
                            {t.name}
                          </p>
                          <p className="text-xs text-gray-400">{t.email}</p>
                          {t.phone && (
                            <p className="text-xs text-gray-400">{t.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">
                        {t.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={t.teacherType} />
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="space-y-1">
                        {(t.teacherType === "Class Teacher" ||
                          t.teacherType === "Both") &&
                          t.classTeacherClass && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                                CT:
                              </span>
                              <span className="text-xs text-gray-600 font-medium">
                                Class {t.classTeacherClass}-
                                {t.classTeacherSection}
                              </span>
                            </div>
                          )}
                        {(t.teacherType === "Subject Teacher" ||
                          t.teacherType === "Both") &&
                          t.subjectAssignments?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {t.subjectAssignments.slice(0, 3).map((a, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium whitespace-nowrap"
                                >
                                  {a.subject} {a.className}-{a.section}
                                </span>
                              ))}
                              {t.subjectAssignments.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">
                                  +{t.subjectAssignments.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => onView(t)} // ← ADD onClick
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="View"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TEACHER CARD  (mobile)
// ─────────────────────────────────────────────
function TeacherCard({ teacher: t, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(t.id)}
      className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-gray-100 hover:shadow-md hover:border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(t.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 w-4 h-4 rounded accent-blue-600 cursor-pointer"
        />
        {t.profilePicture ? (
          <img
            src={t.profilePicture}
            alt={t.name}
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${t.avatarColor}`}
          >
            {t.avatar}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{t.name}</p>
          <p className="text-xs text-gray-400 truncate">{t.email}</p>
          {t.phone && <p className="text-xs text-gray-400">{t.phone}</p>}
        </div>
        <StatusBadge status={t.status} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TypeBadge type={t.teacherType} />
        <span className="text-xs font-mono text-gray-400">{t.id}</span>
      </div>

      {(t.teacherType === "Class Teacher" || t.teacherType === "Both") &&
        t.classTeacherClass && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-600">
            <GraduationCap size={12} className="text-blue-500" />
            <span className="font-medium">
              Class {t.classTeacherClass}-{t.classTeacherSection}
            </span>
          </div>
        )}

      {(t.teacherType === "Subject Teacher" || t.teacherType === "Both") &&
        t.subjectAssignments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {t.subjectAssignments.slice(0, 3).map((a, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium"
              >
                {a.subject} {a.className}-{a.section}
              </span>
            ))}
            {t.subjectAssignments.length > 3 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">
                +{t.subjectAssignments.length - 3}
              </span>
            )}
          </div>
        )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────
function TeacherFilterBar({ filters, onChange, total, departments, subjects }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const isFiltered = Object.entries(filters).some(
    ([k, v]) => v !== INIT_FILTERS[k],
  );
  const selectClass =
    "h-9 pl-3 pr-8 text-sm rounded-xl border border-gray-200 bg-white text-gray-700 " +
    "shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 " +
    "focus:ring-blue-400/30 focus:border-blue-400 transition-all";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-gray-400 mr-1">
        <SlidersHorizontal size={14} />
        <span className="text-xs font-semibold uppercase tracking-widest">
          Filters
        </span>
      </div>

      {[
        { key: "type", label: "Type", options: TEACHER_TYPES },
        { key: "department", label: "Dept", options: departments },
        { key: "subject", label: "Subject", options: subjects },
        { key: "status", label: "Status", options: STATUSES },
        { key: "experience", label: "Experience", options: EXPERIENCE_RANGES },
      ].map(({ key, options }) => (
        <div key={key} className="relative">
          <select
            value={filters[key]}
            onChange={(e) => set(key, e.target.value)}
            className={selectClass}
          >
            {(options || []).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
            ▼
          </span>
        </div>
      ))}

      {isFiltered && (
        <button
          onClick={() => onChange(INIT_FILTERS)}
          className="h-9 px-3 text-xs font-medium rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          Clear filters
        </button>
      )}
      <span className="ml-auto text-sm text-gray-400 whitespace-nowrap">
        {total} teacher{total !== 1 ? "s" : ""} found
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUMMARY CARD
// ─────────────────────────────────────────────
function SummaryCard({ icon: Icon, value, label, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
      >
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 leading-tight">
          {value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ViewTeacherModal({ teacher: t, onClose }) {
  if (!t) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Teacher Profile</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X size={18} />
            </button>
          </div>

          {/* Banner */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl mb-5">
            {t.profilePicture ? (
              <img
                src={t.profilePicture}
                alt={t.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${t.avatarColor}`}
              >
                {t.avatar}
              </div>
            )}
            <div className="text-white">
              <p className="text-xl font-bold">{t.name}</p>
              <p className="text-blue-100 text-sm">{t.teacherType}</p>
              <p className="text-blue-200 text-xs mt-0.5">{t.id}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Contact
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Email</span>
                  <span className="text-gray-700 font-medium truncate max-w-[55%]">
                    {t.email || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-gray-700 font-medium">
                    {t.phone || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Assignment
              </p>
              {(t.teacherType === "Class Teacher" ||
                t.teacherType === "Both") &&
                t.classTeacherClass && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Class</span>
                    <span className="text-gray-700 font-medium">
                      Class {t.classTeacherClass}-{t.classTeacherSection}
                    </span>
                  </div>
                )}
              {t.subjectAssignments?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {t.subjectAssignments.map((a, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium"
                    >
                      {a.subject} {a.className}-{a.section}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Aadhaar */}
            <div className="bg-gray-50 rounded-xl p-3 sm:col-span-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Aadhaar Details
              </p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Aadhaar Number</span>
                <span className="text-gray-700 font-medium font-mono">
                  {t.aadharNumber
                    ? t.aadharNumber.replace(
                        /(\d{4})(\d{4})(\d{4})/,
                        "$1 $2 $3",
                      )
                    : "—"}
                </span>
              </div>
              {t.aadharImageUrl && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Aadhaar Card Image
                  </p>
                  <a href={t.aadharImageUrl} target="_blank" rel="noreferrer">
                    <img
                      src={t.aadharImageUrl}
                      alt="Aadhaar Card"
                      className="h-24 rounded-lg border border-gray-200 object-cover hover:opacity-80 cursor-pointer"
                    />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
];

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [meta, setMeta] = useState({ departments: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INIT_FILTERS);
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/admin/teachers`, { headers }).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/api/admin/teachers/meta`, { headers }).then((r) =>
        r.json(),
      ),
    ])
      .then(([teacherData, metaData]) => {
        if (Array.isArray(teacherData)) setTeachers(teacherData);
        else setError(teacherData.message || "Failed to load teachers");
        if (metaData.departments) setMeta(metaData);
      })
      .catch(() => setError("Network error — could not reach server"))
      .finally(() => setLoading(false));
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────
  const total = teachers.length;
  const active = teachers.filter((t) => t.status === "Active").length;
  const onLeave = teachers.filter((t) => t.status === "On Leave").length;
  const classTchr = teachers.filter(
    (t) => t.teacherType === "Class Teacher" || t.teacherType === "Both",
  ).length;

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return teachers.filter((t) => {
      const matchQ =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q);
      const matchDept =
        filters.department === "All Departments" ||
        t.department === filters.department;
      const matchSubj =
        filters.subject === "All Subjects" ||
        t.subjectAssignments?.some((a) => a.subject === filters.subject);
      const matchStat =
        filters.status === "All Status" || t.status === filters.status;
      const matchExp = expMatch(t.experience || 0, filters.experience);
      const matchType =
        filters.type === "All Types" || t.teacherType === filters.type;
      return (
        matchQ && matchDept && matchSubj && matchStat && matchExp && matchType
      );
    });
  }, [teachers, search, filters]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const toggleAll = (ids) =>
    setSelected((p) => (p.length === ids.length ? [] : ids));

  // const handleSaved = (updatedTeacher) => {
  //   setTeachers(prev => {
  //     const index = prev.findIndex(t => t.id === updatedTeacher.id);
  //     if (index !== -1) {
  //       // Update existing teacher
  //       const newTeachers = [...prev];
  //       newTeachers[index] = {
  //         ...updatedTeacher,
  //         avatar: getInitials(updatedTeacher.name),
  //         avatarColor: AVATAR_COLORS[(updatedTeacher.dbId || index) % AVATAR_COLORS.length],
  //       };
  //       return newTeachers;
  //     } else {
  //       // Add new teacher
  //       return [...prev, {
  //         ...updatedTeacher,
  //         avatar: getInitials(updatedTeacher.name),
  //         avatarColor: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
  //       }];
  //     }
  //   });
  // };
  const handleSaved = async () => {
    // Simply re-fetch the full list — avoids ID format mismatch entirely
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const teacherData = await fetch(`${API_BASE}/api/admin/teachers`, {
        headers,
      }).then((r) => r.json());
      if (Array.isArray(teacherData)) setTeachers(teacherData);
    } catch {
      // silent — list will refresh on next page load
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this teacher?")) return;
    const token = getToken();
    try {
      const teacher = teachers.find((t) => t.id === id);
      const dbId = teacher?.dbId;
      await fetch(`${API_BASE}/api/admin/teachers/${dbId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers((p) => p.filter((t) => t.id !== id));
      setSelected((p) => p.filter((x) => x !== id));
    } catch {
      alert("Failed to delete teacher");
    }
  };

  const departments = ["All Departments", ...meta.departments];
  const subjects = ["All Subjects", ...meta.subjects];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100
                           flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm"
        >
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-64 max-w-full">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search teachers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
            </button>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700
                              flex items-center justify-center text-white text-xs font-bold"
              >
                AP
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                Admin
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* Page body */}
        <div className="flex-1 p-6 lg:p-8 space-y-5">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Teachers
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage all teacher records and assignments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-10 px-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white
                                 text-gray-600 text-sm font-medium shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="h-10 px-4 flex items-center gap-2 rounded-xl bg-blue-600 text-white
                           text-sm font-semibold shadow-sm shadow-blue-900/20 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Plus size={15} /> Add Teacher
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              icon={Users}
              value={loading ? "—" : total}
              label="Total Teachers"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <SummaryCard
              icon={UserCheck}
              value={loading ? "—" : active}
              label="Active"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <SummaryCard
              icon={UserMinus}
              value={loading ? "—" : onLeave}
              label="On Leave"
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <SummaryCard
              icon={GraduationCap}
              value={loading ? "—" : classTchr}
              label="Class Teachers"
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
          </div>

          {/* Filter bar */}
          <TeacherFilterBar
            filters={filters}
            onChange={setFilters}
            total={filtered.length}
            departments={departments}
            subjects={subjects}
          />

          {/* Bulk action bar */}
          {selected.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 rounded-xl text-white text-sm shadow-lg shadow-blue-900/20">
              <span className="font-semibold">{selected.length} selected</span>
              <span className="text-blue-300">·</span>
              <button className="underline underline-offset-2 hover:text-blue-200 transition-colors">
                Delete
              </button>
              <button className="underline underline-offset-2 hover:text-blue-200 transition-colors">
                Export
              </button>
              <button
                onClick={() => setSelected([])}
                className="ml-auto text-blue-300 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span className="text-sm">Loading teachers…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="py-12 text-center text-red-500">
              <p className="font-medium">{error}</p>
              <p className="text-sm text-gray-400 mt-1">
                Check your network or login session
              </p>
            </div>
          )}

          {/* Desktop table */}
          {!loading && !error && (
            <div className="hidden md:block">
              <TeacherTable
                teachers={filtered}
                selected={selected}
                onSelect={toggleSelect}
                onSelectAll={toggleAll}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onView={setViewingTeacher}
              />
            </div>
          )}

          {/* Mobile cards */}
          {!loading && !error && (
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-gray-400">
                  <p className="text-base font-medium">No teachers found</p>
                  <p className="text-sm mt-1">
                    Try adjusting your filters or search
                  </p>
                </div>
              ) : (
                filtered.map((t) => (
                  <TeacherCard
                    key={t.id}
                    teacher={t}
                    selected={selected.includes(t.id)}
                    onSelect={toggleSelect}
                  />
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && (
            <div className="flex items-center justify-between text-sm text-gray-400 pb-2">
              <p>
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filtered.length}
                </span>{" "}
                of <span className="font-semibold text-gray-700">{total}</span>{" "}
                teachers
              </p>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-500 transition-colors">
                  ←
                </button>
                <button className="w-8 h-8 rounded-lg bg-blue-600 text-white font-semibold text-xs">
                  1
                </button>
                <button className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-500 transition-colors">
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Teacher Modal */}
      {showModal && (
        <AddTeacherModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          subjectsList={meta.subjects}
          classesMeta={meta}
        />
      )}
      {/* Edit Teacher Modal */}
      {showEditModal && (
        <EditTeacherModal
          teacher={editingTeacher}
          onClose={() => {
            setShowEditModal(false);
            setEditingTeacher(null);
          }}
          onSaved={handleSaved}
          subjectsList={meta.subjects}
          classesMeta={meta}
        />
      )}
      {viewingTeacher && (
        <ViewTeacherModal
          teacher={viewingTeacher}
          onClose={() => setViewingTeacher(null)}
        />
      )}
    </div>
  );
}
