"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTIONS = ["All", "A", "B", "C"];
const GENDERS = ["All", "Male", "Female"];
const PER_PAGE = 10;

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

// ─── Media URL helper ─────────────────────────────────────────────────────────  ← ADD HERE
function getInitials(name = "") {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function avatarColor(name = "") {
  let h = 0;
  for (let c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function normalizeClassName(value = "") {
  return String(value)
    .replace(/^Class\s+/i, "")
    .trim();
}

// ─── Normalize DB row → UI shape ──────────────────────────────────────────────
function normalizeStudent(s) {
  return {
    id: s.id,
    studentId: s.student_id || "",
    userId: s.user_id,
    name: s.name || "",
    email: s.email || "",
    roll: s.roll_number || "",
    class: normalizeClassName(s.class),
    section: s.section || "",
    classTeacher: s.class_teacher || "",
    gender: s.gender || "",
    dob: s.date_of_birth
      ? new Date(s.date_of_birth).toISOString().split("T")[0]
      : "",
    address: s.address || "",
    phone: s.phone || "",
    parentName: s.guardian_name || "",
    parentContact: s.guardian_phone || "",
    fee: s.fee_status || "Pending",
    attendance:
      typeof s.attendance_pct !== "undefined" ? Number(s.attendance_pct) : 0,
    isActive: s.is_active,
    photoUrl: getMediaUrl(s.photo_url), // ← wrapped
    classId: s.class_id ? String(s.class_id) : "",
    aadharNumber: s.aadhar_number || "",
    aadharImageUrl: getMediaUrl(s.aadhar_image_url), // ← wrapped
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  list: async () => {
    const response = await apiFetch("/admin/students");
    return response || [];
  },

  meta: async () => {
    try {
      const response = await apiFetch("/admin/students/meta");
      return response || [];
    } catch (err) {
      console.error("Meta fetch error:", err);
      return [];
    }
  },

  create: async (body) => {
    const response = await apiFetch("/admin/students", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response || !response.id) {
      throw new Error("Server did not return a valid student ID");
    }

    return response;
  },

  update: async (id, body) => {
    const response = await apiFetch(`/admin/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return response;
  },

  remove: async (id) => {
    const response = await apiFetch(`/admin/students/${id}`, {
      method: "DELETE",
    });
    return response;
  },
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(students) {
  const headers = [
    "Student ID",
    "Name",
    "Roll",
    "Class",
    "Section",
    "Gender",
    "DOB",
    "Email",
    "Phone",
    "Parent Name",
    "Parent Contact",
    "Address",
  ];
  const rows = students.map((s) => [
    s.studentId,
    s.name,
    s.roll,
    s.class,
    s.section,
    s.gender,
    s.dob,
    s.email,
    s.phone,
    s.parentName,
    s.parentContact,
    s.address,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${v || ""}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `students_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components (Avatar, StudentAvatar, Toast, etc.) ──────────────────────
function Avatar({ name, size = "md" }) {
  const sz =
    size === "lg"
      ? "w-16 h-16 text-xl"
      : size === "sm"
        ? "w-8 h-8 text-xs"
        : "w-10 h-10 text-sm";
  const initials = getInitials(name);
  const colorClass = avatarColor(name);

  return (
    <div
      className={`${sz} ${colorClass} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

function StudentAvatar({ name, photoUrl, size = "md" }) {
  const sz =
    size === "lg"
      ? "w-16 h-16 text-xl"
      : size === "sm"
        ? "w-8 h-8 text-xs"
        : "w-10 h-10 text-sm";
  const [imgError, setImgError] = useState(false);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sz} rounded-full object-cover flex-shrink-0 border border-gray-200`}
        onError={() => setImgError(true)}
      />
    );
  }
  return <Avatar name={name} size={size} />;
}

function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  const color =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-green-50 border-green-200 text-green-700";
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2 ${color}`}
    >
      {type === "error" ? "❌" : "✅"} {msg}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ─── Student Row Component ────────────────────────────────────────────────────
function StudentRow({ student, selected, onSelect, onView, onEdit, onDelete }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors group">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(student.id)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {student.name}
            </p>
            <p className="text-xs text-gray-400">{student.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
        {student.studentId || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
        {student.roll}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        <span className="font-medium">Class {student.class}</span>
        <span className="text-gray-400"> – {student.section}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {student.gender || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{student.dob || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {student.phone || "—"}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-700">{student.parentName || "—"}</p>
        {student.parentContact && (
          <p className="text-xs text-gray-400">{student.parentContact}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(student)}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100"
            title="View"
          >
            <EyeIcon />
          </button>
          <button
            onClick={() => onEdit(student)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            title="Edit"
          >
            <EditIcon />
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}

function StudentCard({ student, onView, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3 mb-3">
        <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{student.name}</p>
          <p className="text-xs text-gray-400">{student.email}</p>
          {student.studentId && (
            <p className="text-xs text-gray-400 font-mono">
              {student.studentId}
            </p>
          )}
          <p className="text-xs text-gray-400">Roll #{student.roll}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
        <span>
          Class {student.class} – {student.section}
        </span>
        <span>{student.gender || "—"}</span>
        {student.dob && <span>DOB: {student.dob}</span>}
        {student.phone && <span>{student.phone}</span>}
        {student.parentName && (
          <span className="col-span-2 text-gray-400">
            Parent: {student.parentName}{" "}
            {student.parentContact && `· ${student.parentContact}`}
          </span>
        )}
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-50">
        <button
          onClick={() => onView(student)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100"
        >
          View
        </button>
        <button
          onClick={() => onEdit(student)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 text-gray-600 font-medium hover:bg-gray-100"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(student.id)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ student, onClose }) {
  if (!student) return null;
  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">Student Profile</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl mb-5">
        <StudentAvatar
          name={student.name}
          photoUrl={student.photoUrl}
          size="lg"
        />
        <div className="text-white">
          <p className="text-xl font-bold">{student.name}</p>
          <p className="text-blue-100 text-sm">
            Class {student.class} – Section {student.section}
          </p>
          <p className="text-blue-200 text-xs mt-0.5">
            Roll No: {student.roll}
          </p>
          {student.studentId && (
            <p className="text-blue-200 text-xs">
              Student ID: {student.studentId}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoBlock title="Personal Details">
          <InfoRow label="Date of Birth" value={student.dob} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Phone" value={student.phone} />
          <InfoRow label="Address" value={student.address} />
          <InfoRow
            label="Aadhaar Number"
            value={
              student.aadharNumber
                ? student.aadharNumber.replace(
                    /(\d{4})(\d{4})(\d{4})/,
                    "$1 $2 $3",
                  )
                : "—"
            }
          />
          {student.aadharImageUrl && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Aadhaar Card</p>
              <a href={student.aadharImageUrl} target="_blank" rel="noreferrer">
                <img
                  src={student.aadharImageUrl}
                  alt="Aadhaar Card"
                  className="h-20 rounded-lg border border-gray-200 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                />
              </a>
            </div>
          )}
        </InfoBlock>
        <InfoBlock title="Class Info">
          <InfoRow label="Class" value={student.class} />
          <InfoRow label="Section" value={student.section} />
          <InfoRow label="Class Teacher" value={student.classTeacher} />
        </InfoBlock>
        <InfoBlock title="Parent / Guardian">
          <InfoRow label="Name" value={student.parentName} />
          <InfoRow label="Contact" value={student.parentContact} />
        </InfoBlock>
      </div>
    </ModalWrapper>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium text-right max-w-[55%] truncate">
        {value || "—"}
      </span>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  roll: "",
  studentId: "",
  classId: "",
  class: "",
  section: "",
  classTeacher: "",
  dob: "",
  gender: "",
  address: "",
  phone: "",
  parentName: "",
  parentContact: "",
  aadharNumber: "",
  aadharImageUrl: "",
};

const STUDENT_DOCUMENT_TYPES = [
  "Transfer Certificate",
  "Birth Certificate",
  "Bonafide Certificate",
  "Character Certificate",
  "Migration Certificate",
  "Marksheet / Report Card",
  "Identity Proof",
  "Address Proof",
  "Caste Certificate",
  "Income Certificate",
  "Domicile Certificate",
  "Medical Record",
  "Vaccination Record",
  "Consent Form",
  "Certificate",
  "Other",
];

const cleanPhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);

const isValidDateValue = (value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    value <= new Date().toISOString().slice(0, 10) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

function AddEditModal({ student, classMeta, onClose, onSave, saving }) {
  const isEdit = !!student;

  const [form, setForm] = useState(() =>
    isEdit ? { ...student, password: "" } : { ...EMPTY_FORM },
  );

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(student?.photoUrl || null);

  const [aadharFile, setAadharFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(
    student?.aadharImageUrl || null,
  );
  const [documentFiles, setDocumentFiles] = useState([]);

  const handleAadharChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Aadhaar image must be under 5MB.");
      return;
    }
    setAadharFile(file);
    setAadharPreview(URL.createObjectURL(file));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be under 2MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDocumentsChange = (event) => {
    const files = Array.from(event.target.files || []);
    const allowedExtensions = /\.(pdf|jpe?g|png|webp|docx?|xlsx?|csv|txt)$/i;
    const unsupported = files.find(
      (file) => !allowedExtensions.test(file.name),
    );
    if (unsupported) {
      alert(`${unsupported.name} is not a supported document format.`);
      event.target.value = "";
      return;
    }
    const invalid = files.find((file) => file.size > 20 * 1024 * 1024);
    if (invalid) {
      alert(`${invalid.name} must be 20MB or smaller.`);
      event.target.value = "";
      return;
    }
    setDocumentFiles((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        document_type: "Certificate",
        title: file.name.replace(/\.[^.]+$/, ""),
      })),
    ]);
    event.target.value = "";
  };

  const updateDocument = (id, key, value) => {
    setDocumentFiles((current) =>
      current.map((document) =>
        document.id === id ? { ...document, [key]: value } : document,
      ),
    );
  };

  const removeDocument = (id) => {
    setDocumentFiles((current) =>
      current.filter((document) => document.id !== id),
    );
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleClassChange = (classId) => {
    const found = classMeta.find((c) => String(c.id) === String(classId));
    if (found) {
      setForm((f) => ({
        ...f,
        classId: String(found.id),
        class: (found.class_name || "").replace(/^Class\s+/i, "").trim(), // ← strip prefix
        section: found.section || "",
        classTeacher: found.teacher_name || "",
      }));
    } else {
      setForm((f) => ({
        ...f,
        classId: "",
        class: "",
        section: "",
        classTeacher: "",
      }));
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return alert("Student name is required.");
    if (!form.roll.trim()) return alert("Roll number is required.");
    if (!form.classId) return alert("Please select a class.");
    if (!isEdit && !form.email.trim()) return alert("Email is required.");
    if (!isEdit && !form.password.trim()) return alert("Password is required.");
    if (!isValidDateValue(form.dob))
      return alert("Date of birth must use a valid 4-digit year.");
    if (form.phone && !/^\d{10}$/.test(cleanPhone(form.phone)))
      return alert("Student phone must be exactly 10 digits.");
    if (form.parentContact && !/^\d{10}$/.test(cleanPhone(form.parentContact)))
      return alert("Parent contact must be exactly 10 digits.");
    if (!form.aadharNumber.trim())
      return alert("Aadhaar card number is required.");
    if (!/^\d{12}$/.test(form.aadharNumber.replace(/\s/g, "")))
      return alert("Aadhaar number must be exactly 12 digits.");
    if (!isEdit && !aadharFile && !form.aadharImageUrl)
      return alert("Aadhaar card image is required.");
    onSave(form, photoFile, aadharFile, documentFiles);
  };

  return (
    <ModalWrapper onClose={onClose} wide>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {isEdit ? "Edit Student" : "Add New Student"}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Photo upload */}
        <div className="sm:col-span-2 flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Avatar name={form.name || "?"} size="lg" />
            )}
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG or WebP · Max 2MB
            </p>
            {photoFile && (
              <p className="text-xs text-green-600 mt-1">✓ {photoFile.name}</p>
            )}
          </div>
        </div>

        <Field
          label={
            isEdit ? "Student ID" : "Student ID (leave blank to auto-generate)"
          }
          value={form.studentId}
          onChange={(v) => set("studentId", v)}
          placeholder="e.g. STU-2024-001"
          disabled={isEdit}
        />

        <Field
          label="Full Name *"
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder="e.g. Aarav Sharma"
        />

        <Field
          label="Roll Number *"
          value={form.roll}
          onChange={(v) => set("roll", v)}
          placeholder="e.g. 42"
        />

        {!isEdit && (
          <>
            <Field
              label="Email *"
              value={form.email}
              onChange={(v) => set("email", v)}
              placeholder="student@school.edu"
              type="email"
            />
            <Field
              label="Password *"
              value={form.password}
              onChange={(v) => set("password", v)}
              placeholder="Min 6 characters"
              type="password"
            />
          </>
        )}

        <div className="sm:col-span-2">
          <label className="field-label">Class *</label>
          {classMeta.length === 0 ? (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ No classes found. Please create classes first.
            </p>
          ) : (
            <select
              value={form.classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="field-input"
            >
              <option value="">— Select a class —</option>
              {classMeta.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.class_name} – Section {c.section}
                  {c.teacher_name ? ` (Teacher: ${c.teacher_name})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="field-label">Grade / Class</label>
          <input
            type="text"
            value={form.class || ""}
            readOnly
            placeholder="Auto-filled"
            className="field-input bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="field-label">Section</label>
          <input
            type="text"
            value={form.section}
            readOnly
            placeholder="Auto-filled"
            className="field-input bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Class Teacher</label>
          <input
            type="text"
            value={form.classTeacher}
            readOnly
            placeholder="Auto-filled"
            className="field-input bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="field-label">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            className="field-input"
          >
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <Field
          label="Date of Birth"
          value={form.dob}
          onChange={(v) => set("dob", v)}
          type="date"
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
        />
        <Field
          label="Phone"
          value={form.phone}
          onChange={(v) => set("phone", cleanPhone(v))}
          placeholder="10-digit number"
          inputMode="numeric"
          maxLength={10}
        />
        <Field
          label="Parent Name"
          value={form.parentName}
          onChange={(v) => set("parentName", v)}
          placeholder="Guardian's full name"
        />
        <Field
          label="Parent Contact"
          value={form.parentContact}
          onChange={(v) => set("parentContact", cleanPhone(v))}
          placeholder="10-digit number"
          inputMode="numeric"
          maxLength={10}
        />

        {/* Aadhaar Number */}
        <div className="sm:col-span-2">
          <label className="field-label">Aadhaar Card Number *</label>
          <input
            type="text"
            value={form.aadharNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 12);
              set("aadharNumber", val);
            }}
            placeholder="12-digit Aadhaar number"
            maxLength={12}
            className="field-input font-mono tracking-widest"
          />
          <p className="text-xs text-gray-400 mt-1">12-digit Aadhaar number</p>
        </div>

        {/* Aadhaar Card Image */}
        <div className="sm:col-span-2">
          <label className="field-label">Aadhaar Card Image *</label>
          <div className="flex items-start gap-4">
            {aadharPreview && (
              <div className="flex-shrink-0">
                <img
                  src={aadharPreview}
                  alt="Aadhaar Preview"
                  className="h-28 rounded-lg border border-gray-200 object-cover shadow-sm"
                />
                <p className="text-xs text-green-600 mt-1 text-center">
                  ✓ Uploaded
                </p>
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {aadharPreview ? "Change Image" : "Upload Aadhaar Image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleAadharChange}
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
        <div className="sm:col-span-2">
          <Field
            label="Address (as per Aadhaar Card) *"
            value={form.address}
            onChange={(v) => set("address", v)}
            placeholder="Full address as printed on Aadhaar card"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label">Additional Student Documents</label>
          <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 px-4 py-5 text-sm font-semibold text-orange-700 hover:bg-orange-50">
            Select student documents
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleDocumentsChange}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-xs text-gray-400">
            Birth certificate, transfer certificate, medical record, consent
            form, marksheet, Word/Excel file, or other documents. Maximum 20MB
            per file.
          </p>
          {documentFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {documentFiles.map((document) => (
                <div
                  key={document.id}
                  className="grid gap-2 rounded-lg border border-orange-100 bg-white p-3 sm:grid-cols-[1fr_180px_auto]"
                >
                  <input
                    value={document.title}
                    onChange={(event) =>
                      updateDocument(document.id, "title", event.target.value)
                    }
                    className="field-input"
                    placeholder="Document title"
                  />
                  <select
                    value={document.document_type}
                    onChange={(event) =>
                      updateDocument(
                        document.id,
                        "document_type",
                        event.target.value,
                      )
                    }
                    className="field-input"
                  >
                    {STUDENT_DOCUMENT_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeDocument(document.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    Remove
                  </button>
                  <p className="text-xs text-gray-400 sm:col-span-3">
                    {document.file.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Spinner />}
          {isEdit ? "Save Changes" : "Add Student"}
        </button>
      </div>
    </ModalWrapper>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  min,
  max,
  maxLength,
  inputMode,
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`field-input ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

function ModalWrapper({ children, onClose, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-y-auto max-h-[90vh] ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({ count = 1, onClose, onConfirm, saving }) {
  return (
    <ModalWrapper onClose={onClose}>
      <div className="text-center py-2">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrashIcon className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Delete {count > 1 ? `${count} Students` : "Student"}?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This action cannot be undone. All {count > 1 ? "their" : "the"} data
          will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Spinner />}
            Delete
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "All"
            ? `All ${label}s`
            : label === "Section"
              ? `Section ${o}`
              : o}
        </option>
      ))}
    </select>
  );
}

function PaginationBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// Icons
const EyeIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const CloseIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classMeta, setClassMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterSection, setFilterSection] = useState("All");
  const [filterGender, setFilterGender] = useState("All");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const showToast = useCallback(
    (msg, type = "success") => setToast({ msg, type }),
    [],
  );

  const classOptions = useMemo(() => {
    const unique = [...new Set(students.map((s) => s.class))]
      .filter(Boolean)
      .sort();
    return ["All", ...unique];
  }, [students]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [studentsData, metaData] = await Promise.all([
        api.list(),
        api.meta().catch(() => []),
      ]);
      setStudents((studentsData || []).map(normalizeStudent));
      setClassMeta(
        (metaData || []).map((classItem) => ({
          ...classItem,
          class_name: normalizeClassName(classItem.class_name),
        })),
      );
    } catch (err) {
      console.error("Fetch error:", err);
      setFetchError("Failed to load students. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.roll.includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        `class ${s.class}`.includes(q) ||
        s.email.toLowerCase().includes(q);
      const matchClass = filterClass === "All" || s.class === filterClass;
      const matchSection =
        filterSection === "All" || s.section === filterSection;
      const matchGender = filterGender === "All" || s.gender === filterGender;
      return matchSearch && matchClass && matchSection && matchGender;
    });
  }, [students, search, filterClass, filterSection, filterGender]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSelect = useCallback((id) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((s) =>
      s.length === paginated.length ? [] : paginated.map((s) => s.id),
    );
  }, [paginated]);

  const handleSave = useCallback(
    async (form, photoFile, aadharFile, documentFiles = []) => {
      setSaving(true);
      let savedId = null;

      try {
        // Prepare the data exactly as backend expects
        const studentData = {
          name: form.name,
          email: form.email,
          password: form.password,
          roll_number: form.roll,
          class_id: parseInt(form.classId), // Ensure it's a number
          class: form.class,
          section: form.section,
          class_teacher: form.classTeacher,
          date_of_birth: form.dob || null,
          gender: form.gender || null,
          address: form.address || null,
          phone: form.phone || null,
          guardian_name: form.parentName || null,
          guardian_phone: form.parentContact || null,
          aadhar_number: form.aadharNumber.replace(/\s/g, "") || null,
        };

        // Add student_id only if provided (for edit or manual entry)
        if (form.studentId) {
          studentData.student_id = form.studentId;
        }

        let result;
        if (form.id) {
          // Update existing student
          const updateData = {
            class_id: parseInt(form.classId),
            class: form.class,
            section: form.section,
            class_teacher: form.classTeacher,
            phone: form.phone,
            address: form.address,
            guardian_name: form.parentName,
            guardian_phone: form.parentContact,
            aadhar_number: form.aadharNumber.replace(/\s/g, "") || null,
          };
          result = await api.update(form.id, updateData);
          savedId = form.id;
          showToast("Student updated successfully.");
        } else {
          // Create new student
          result = await api.create(studentData);
          savedId = result.id;
          showToast("Student added successfully.");
        }

        // Handle photo upload if exists
        if (photoFile && savedId) {
          try {
            const formData = new FormData();
            formData.append("photo", photoFile);

            await apiFetch(`/admin/students/${savedId}/photo`, {
              method: "POST",
              body: formData,
            });
            showToast(
              form.id
                ? "Photo updated successfully."
                : "Student added with photo.",
            );
          } catch (photoErr) {
            console.error("Photo upload failed:", photoErr);
            showToast("Student saved but photo upload failed.", "error");
          }
        }
        if (aadharFile && savedId) {
          try {
            const formData = new FormData();
            formData.append("aadhar_image", aadharFile);
            await apiFetch(`/admin/students/${savedId}/aadhar-image`, {
              method: "POST",
              body: formData,
            });

            const documentData = new FormData();
            documentData.append("student_id", savedId);
            documentData.append("document_type", "Identity Proof");
            documentData.append("title", "Aadhaar Card");
            documentData.append(
              "document_number",
              form.aadharNumber.replace(/\s/g, ""),
            );
            documentData.append("file", aadharFile);
            await apiFetch("/documents", {
              method: "POST",
              body: documentData,
            });
          } catch (err) {
            console.error("Aadhaar image upload failed:", err);
            showToast(
              "Student saved but Aadhaar document upload failed.",
              "error",
            );
          }
        }

        if (documentFiles.length && savedId) {
          const failedDocuments = [];
          for (const document of documentFiles) {
            try {
              const documentData = new FormData();
              documentData.append("student_id", savedId);
              documentData.append(
                "document_type",
                document.document_type || "Other",
              );
              documentData.append(
                "title",
                document.title.trim() || document.file.name,
              );
              documentData.append("file", document.file);
              await apiFetch("/documents", {
                method: "POST",
                body: documentData,
              });
            } catch (error) {
              console.error("Student document upload failed:", error);
              failedDocuments.push(document.file.name);
            }
          }
          if (failedDocuments.length) {
            showToast(
              `Student saved, but ${failedDocuments.length} document upload(s) failed.`,
              "error",
            );
          } else {
            showToast(
              `${documentFiles.length} student document(s) uploaded successfully.`,
            );
          }
        }

        setShowAddEdit(false);
        setEditStudent(null);
        await fetchAll();
      } catch (err) {
        console.error("Save error:", err);
        showToast(err?.message || "Failed to save student.", "error");
      } finally {
        setSaving(false);
      }
    },
    [fetchAll, showToast],
  );

  const handleDeleteRequest = useCallback((id) => {
    setDeleteTarget({ ids: [id], bulk: false });
  }, []);

  const handleBulkDeleteRequest = useCallback(() => {
    if (selected.length) setDeleteTarget({ ids: [...selected], bulk: true });
  }, [selected]);

  const confirmDelete = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all(deleteTarget.ids.map((id) => api.remove(id)));
      showToast(
        `${deleteTarget.ids.length > 1 ? `${deleteTarget.ids.length} students` : "Student"} deleted.`,
      );
      setSelected((s) => s.filter((x) => !deleteTarget.ids.includes(x)));
      setDeleteTarget(null);
      await fetchAll();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, fetchAll, showToast]);

  const resetFilters = useCallback(() => {
    setFilterClass("All");
    setFilterSection("All");
    setFilterGender("All");
    setSearch("");
    setPage(1);
  }, []);

  const totalStudents = students.length;
  const totalMale = students.filter((s) => s.gender === "Male").length;
  const totalFemale = students.filter((s) => s.gender === "Female").length;
  const withParent = students.filter((s) => s.parentName).length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              Students
            </h1>
            <p className="text-sm text-gray-400">Manage all student records</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-64">
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ID, roll, class…"
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
              />
            </div>

            <button
              onClick={fetchAll}
              title="Refresh"
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>

            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            <button
              onClick={() => {
                setEditStudent(null);
                setShowAddEdit(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Student
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {fetchError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {fetchError}
              <button
                onClick={fetchAll}
                className="text-red-700 font-semibold hover:underline text-xs ml-4"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Students",
                value: loading ? "…" : totalStudents,
                color: "text-blue-600",
                bg: "bg-blue-50",
                icon: "👥",
              },
              {
                label: "Male",
                value: loading ? "…" : totalMale,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                icon: "👦",
              },
              {
                label: "Female",
                value: loading ? "…" : totalFemale,
                color: "text-pink-600",
                bg: "bg-pink-50",
                icon: "👧",
              },
              {
                label: "With Guardian",
                value: loading ? "…" : withParent,
                color: "text-green-600",
                bg: "bg-green-50",
                icon: "👪",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
              >
                <div
                  className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-lg`}
                >
                  {s.icon}
                </div>
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Filters
            </span>

            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer"
            >
              {classOptions.map((o) => (
                <option key={o} value={o}>
                  {o === "All" ? "All Classes" : `Class ${o}`}
                </option>
              ))}
            </select>

            <Select
              value={filterSection}
              onChange={(v) => {
                setFilterSection(v);
                setPage(1);
              }}
              options={SECTIONS}
              label="Section"
            />
            <Select
              value={filterGender}
              onChange={(v) => {
                setFilterGender(v);
                setPage(1);
              }}
              options={GENDERS}
              label="Gender"
            />

            {(filterClass !== "All" ||
              filterSection !== "All" ||
              filterGender !== "All" ||
              search) && (
              <button
                onClick={resetFilters}
                className="text-xs text-red-500 font-semibold hover:text-red-600 underline underline-offset-2"
              >
                Reset
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {filtered.length} student{filtered.length !== 1 ? "s" : ""}{" "}
                found
              </span>
              {selected.length > 0 && (
                <button
                  onClick={handleBulkDeleteRequest}
                  className="text-xs text-red-500 font-semibold px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Delete {selected.length} selected
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={
                            selected.length === paginated.length &&
                            paginated.length > 0
                          }
                          onChange={toggleAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </th>
                      {[
                        "Photo & Name",
                        "Student ID",
                        "Roll No.",
                        "Class & Section",
                        "Gender",
                        "Date of Birth",
                        "Phone",
                        "Parent / Guardian",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length > 0 ? (
                      paginated.map((s) => (
                        <StudentRow
                          key={s.id}
                          student={s}
                          selected={selected.includes(s.id)}
                          onSelect={toggleSelect}
                          onView={setViewStudent}
                          onEdit={(st) => {
                            setEditStudent(st);
                            setShowAddEdit(true);
                          }}
                          onDelete={handleDeleteRequest}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center py-16 text-gray-400"
                        >
                          <div className="text-4xl mb-2">🔍</div>
                          <p className="font-medium">No students found</p>
                          <p className="text-xs mt-1">
                            Try adjusting your filters or add a new student
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden grid grid-cols-1 gap-3">
                {paginated.length > 0 ? (
                  paginated.map((s) => (
                    <StudentCard
                      key={s.id}
                      student={s}
                      onView={setViewStudent}
                      onEdit={(st) => {
                        setEditStudent(st);
                        setShowAddEdit(true);
                      }}
                      onDelete={handleDeleteRequest}
                    />
                  ))
                ) : (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="font-medium">No students found</p>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400">
                    Showing {(page - 1) * PER_PAGE + 1}–
                    {Math.min(page * PER_PAGE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <PaginationBtn
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </PaginationBtn>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${pageNum === page ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <PaginationBtn
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </PaginationBtn>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {viewStudent && (
        <ViewModal student={viewStudent} onClose={() => setViewStudent(null)} />
      )}

      {showAddEdit && (
        <AddEditModal
          student={editStudent}
          classMeta={classMeta}
          saving={saving}
          onClose={() => {
            setShowAddEdit(false);
            setEditStudent(null);
          }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          count={deleteTarget.ids.length}
          saving={saving}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      <Toast
        msg={toast.msg}
        type={toast.type}
        onDismiss={() => setToast({ msg: "", type: "success" })}
      />
    </div>
  );
}
