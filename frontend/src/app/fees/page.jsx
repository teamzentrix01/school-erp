"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Bus,
  ChevronDown,
  ChevronUp,
  Save,
  IndianRupee,
  Users,
  BookOpen,
  Wrench,
  GraduationCap,
  CreditCard,
  Banknote,
  Hotel,
  Utensils,
  XCircle,
  Eye,
  RefreshCw,
  ImageIcon,
  BadgeCheck,
  Ban,
  ChevronRight,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const getToken = () => {
  if (typeof window === "undefined") return null;
  const m = document.cookie.match(/(^| )token=([^;]+)/);
  return m ? m[2] : null;
};
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const currentAcademicYear = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
};

const apiFetch = (path, opts = {}) =>
  fetch(`${API_BASE}/api${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(opts.body && !(opts.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...opts,
  }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];
function getInitials(name = "") {
  const p = name.trim().split(" ").filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function avatarColor(name = "") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

const STATUS_MAP = {
  Paid: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  Pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  Partial: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
    icon: Clock,
  },
  Overdue: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    dot: "bg-red-500",
    icon: AlertCircle,
  },
};

const PAYMENT_STATUS = {
  approved: {
    label: "Approved",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  pending_approval: {
    label: "Awaiting Approval",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600 bg-red-50 border-red-200",
  },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status || "Pending"}
    </span>
  );
}

function Toast({ msg, type, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2 ${
        type === "error"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-green-50 border-green-200 text-green-700"
      }`}
    >
      {type === "error" ? "❌" : "✅"} {msg}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ─── Class Fee Form ───────────────────────────────────────────────────────────
function ClassFeeForm({ cls, onSaved }) {
  const [form, setForm] = useState({
    tuition_fee: "",
    library_fee: "",
    other_fee: "",
    due_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSave = async () => {
    if (!form.tuition_fee) return setMsg("Tuition fee required.");
    setSaving(true);
    setMsg("");
    try {
      await apiFetch("/fees/structures", {
        method: "POST",
        body: JSON.stringify({
          class: cls.class || cls.grade || cls.class_name,
          section: cls.section || undefined,
          academic_year: currentAcademicYear(),
          tuition_fee: Number(form.tuition_fee || 0),
          library_fee: Number(form.library_fee || 0),
          other_fee: Number(form.other_fee || 0),
          due_date: form.due_date || undefined,
        }),
      });
      setMsg("✅ Class fees saved & applied to all students.");
      onSaved?.();
    } catch {
      setMsg("❌ Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const total =
    Number(form.tuition_fee || 0) +
    Number(form.library_fee || 0) +
    Number(form.other_fee || 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-emerald-600" />
        <h3 className="font-bold text-gray-900 text-sm">
          Set Base Fees — Class {cls.grade || cls.class_name}
          {cls.section ? `-${cls.section}` : ""}
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            key: "tuition_fee",
            label: "Tuition Fee",
            icon: GraduationCap,
            required: true,
          },
          {
            key: "library_fee",
            label: "Library Fee",
            icon: BookOpen,
            required: false,
          },
          {
            key: "other_fee",
            label: "Other Fee",
            icon: Wrench,
            required: false,
          },
        ].map(({ key, label, icon: Icon, required }) => (
          <div key={key}>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Icon size={11} /> {label}{" "}
              {required && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
              <IndianRupee
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="number"
                min="0"
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Due Date
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, due_date: e.target.value }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Base Total
          </p>
          <div className="flex items-center gap-1 text-lg font-bold text-emerald-600">
            <IndianRupee size={14} />
            {total.toLocaleString("en-IN")}
            <span className="text-xs text-gray-400 font-normal ml-1">
              / student
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <p
          className={`text-xs font-medium ${msg.startsWith("✅") ? "text-emerald-600" : "text-red-500"}`}
        >
          {msg}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
      >
        {saving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Save size={14} />
        )}
        {saving ? "Saving…" : "Save & Apply to All Students"}
      </button>
    </div>
  );
}

// ─── Per-Student Transport Row ────────────────────────────────────────────────
function StudentTransportRow({ student, onUpdate }) {
  const [transport, setTransport] = useState(
    String(student.transport_fee || ""),
  );
  const [saving, setSaving] = useState(false);
  const dirty = String(student.transport_fee || 0) !== transport;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(student.id, Number(transport));
    setSaving(false);
  };

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-xl ${avatarColor(student.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
          >
            {getInitials(student.name)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {student.name}
            </p>
            <p className="text-xs text-gray-400">{student.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-500">
        {student.roll_no || student.roll_number || "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <IndianRupee size={12} className="text-gray-400" />
          {Number(student.tuition_fee || 0).toLocaleString("en-IN")}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-28">
            <IndianRupee
              size={11}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="number"
              min="0"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              placeholder="0"
              className={`w-full pl-6 pr-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all ${
                dirty ? "border-blue-300 bg-blue-50" : "border-gray-200"
              }`}
            />
          </div>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-xs bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Save size={11} />
              )}
              Save
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
          <IndianRupee size={12} className="text-gray-500" />
          {(
            Number(student.tuition_fee || 0) +
            Number(student.library_fee || 0) +
            Number(student.other_fee || 0) +
            Number(transport || 0) +
            Number(student.hostel_fee || 0) +
            Number(student.mess_fee || 0)
          ).toLocaleString("en-IN")}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
          <IndianRupee size={12} />
          {Number(student.paid_amount || 0).toLocaleString("en-IN")}
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className={`text-sm font-semibold flex items-center gap-1 ${
            Number(student.total_fees || 0) - Number(student.paid_amount || 0) >
            0
              ? "text-red-500"
              : "text-emerald-500"
          }`}
        >
          <IndianRupee size={12} />
          {(
            Number(student.total_fees || 0) - Number(student.paid_amount || 0)
          ).toLocaleString("en-IN")}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={student.status} />
      </td>
    </tr>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-200 text-gray-400"
                }`}
              >
                {done ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span
                className={`text-[9px] font-semibold whitespace-nowrap ${
                  active
                    ? "text-emerald-700"
                    : done
                      ? "text-emerald-500"
                      : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-10 h-0.5 mb-3.5 mx-1 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Cash Payment Modal (3-step: Class → Student → Amount) ───────────────────
function CashPaymentModal({ classes, onClose, onSuccess, setToast }) {
  // Step 0: pick class+section | Step 1: pick student | Step 2: amount+note
  const [step, setStep] = useState(0);
  const [selectedClass, setSelectedClass] = useState(null); // full class object
  const [classStudents, setClassStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // student fee record
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch students for chosen class
  const fetchStudentsForClass = useCallback(async (cls) => {
    setStudentsLoading(true);
    setClassStudents([]);
    try {
      const clsName = cls.class || cls.grade || cls.class_name;
      const section = cls.section || "";
      const params = new URLSearchParams({
        class: clsName,
        academic_year: currentAcademicYear(),
        limit: "200",
      });
      if (section) params.append("section", section);
      const data = await apiFetch(`/fees/students?${params}`);
      setClassStudents(data.data || []);
    } catch {
      setClassStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setSearch("");
    setSelected(null);
    fetchStudentsForClass(cls);
    setStep(1);
  };

  const handleStudentSelect = (s) => {
    setSelected(s);
    setAmount("");
    setError("");
    setStep(2);
  };

  const remaining = selected
    ? Math.max(
        0,
        Number(selected.total_fees || 0) - Number(selected.paid_amount || 0),
      )
    : 0;

  const handleSubmit = async () => {
    if (!selected) return setError("Please select a student");
    if (!amount || Number(amount) <= 0) return setError("Enter a valid amount");
    if (Number(amount) > remaining)
      return setError(`Max payable: ₹${remaining.toLocaleString("en-IN")}`);

    setSaving(true);
    setError("");
    try {
      await apiFetch("/fees/admin/cash-payment", {
        method: "POST",
        body: JSON.stringify({
          student_fee_id: selected.id,
          amount: Number(amount),
          note: note || "Cash payment",
        }),
      });
      setToast({
        msg: `₹${Number(amount).toLocaleString("en-IN")} recorded for ${selected.name}!`,
        type: "success",
      });
      onSuccess?.();
      onClose();
    } catch {
      setError("Failed to record payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered students list (only with remaining fees)
  const filteredStudents = useMemo(() => {
    let list = classStudents.filter(
      (s) => Number(s.total_fees || 0) - Number(s.paid_amount || 0) > 0,
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          String(s.roll_no || s.roll_number || "").includes(q),
      );
    }
    return list;
  }, [classStudents, search]);

  const clsLabel = (cls) =>
    `Class ${cls.grade || cls.class_name}${cls.section ? `-${cls.section}` : ""}`;

  const STEPS = ["Class", "Student", "Amount"];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Banknote size={18} className="text-white" />
            <h2 className="text-white font-bold text-sm">
              Record Cash Payment
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <XCircle size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 flex justify-center">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {/* Breadcrumb trail */}
        {(selectedClass || selected) && (
          <div className="px-5 pb-2 flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0 flex-wrap">
            {selectedClass && (
              <>
                <button
                  onClick={() => {
                    setStep(0);
                    setSelected(null);
                    setSelectedClass(null);
                    setSearch("");
                  }}
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  {clsLabel(selectedClass)}
                </button>
              </>
            )}
            {selected && (
              <>
                <ChevronRight size={10} />
                <button
                  onClick={() => {
                    setStep(1);
                    setSelected(null);
                    setSearch("");
                    setAmount("");
                  }}
                  className="text-emerald-600 font-semibold hover:underline truncate max-w-[120px]"
                >
                  {selected.name}
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
          {/* ── STEP 0: Select Class ── */}
          {step === 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-3 font-medium">
                Select class and section:
              </p>
              {classes.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No classes found
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {classes.map((cls, i) => (
                    <button
                      key={cls.id || i}
                      onClick={() => handleClassSelect(cls)}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-300 rounded-xl text-left transition-all group"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700">
                          {clsLabel(cls)}
                        </p>
                        {cls.student_count != null && (
                          <p className="text-[10px] text-gray-400">
                            {cls.student_count} students
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-gray-300 group-hover:text-emerald-500 flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Select Student ── */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">
                  {clsLabel(selectedClass)}&apos;s students:
                </p>
                <button
                  onClick={() => {
                    setStep(0);
                    setSelectedClass(null);
                    setSearch("");
                  }}
                  className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Change Class
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or roll no...."
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {studentsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-gray-100 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">
                    {search
                      ? "No results found"
                      : "No student has pending fees to pay."}
                  </p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  {filteredStudents.map((s) => {
                    const rem =
                      Number(s.total_fees || 0) - Number(s.paid_amount || 0);
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleStudentSelect(s)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left group"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl ${avatarColor(s.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {s.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-gray-100 text-gray-500 font-mono px-1.5 py-0.5 rounded">
                              Roll {s.roll_no || s.roll_number || "—"}
                            </span>
                            <StatusBadge status={s.status} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-red-500 flex items-center gap-0.5">
                            <IndianRupee size={11} />
                            {rem.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-gray-400">pending</p>
                        </div>
                        <ChevronRight
                          size={13}
                          className="text-gray-200 group-hover:text-emerald-500 flex-shrink-0 ml-1"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {!studentsLoading &&
                classStudents.length > 0 &&
                filteredStudents.length === 0 &&
                !search && (
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Sab fees clear hain is class mein 🎉
                  </p>
                )}
            </div>
          )}

          {/* ── STEP 2: Amount + Note ── */}
          {step === 2 && selected && (
            <div className="space-y-3">
              {/* Selected student card */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${avatarColor(selected.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {getInitials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {selected.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] bg-white border border-emerald-200 text-gray-500 font-mono px-1.5 py-0.5 rounded">
                      Roll {selected.roll_no || selected.roll_number || "—"}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      {clsLabel(selectedClass)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelected(null);
                    setAmount("");
                    setError("");
                  }}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <XCircle size={16} />
                </button>
              </div>

              {/* Fee summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Total Fees</p>
                  <p className="text-xs font-bold text-gray-800 flex items-center justify-center gap-0.5">
                    <IndianRupee size={10} />
                    {Number(selected.total_fees || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Paid</p>
                  <p className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-0.5">
                    <IndianRupee size={10} />
                    {Number(selected.paid_amount || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Remaining</p>
                  <p className="text-xs font-bold text-red-500 flex items-center justify-center gap-0.5">
                    <IndianRupee size={10} />
                    {remaining.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Amount <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <IndianRupee
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    max={remaining}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                    }}
                    placeholder={`Max ₹${remaining.toLocaleString("en-IN")}`}
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <button
                  className="mt-1 text-xs text-emerald-600 font-semibold hover:underline"
                  onClick={() => setAmount(String(remaining))}
                >
                  Full remaining amount (₹{remaining.toLocaleString("en-IN")})
                </button>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Q2 fees cash payment"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                ⚡ Cash payment will be <strong>instantly approved</strong> — no
                receipt verification needed.
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
        {step === 2 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleSubmit}
              disabled={saving || !selected || !amount}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Banknote size={15} />
              )}
              {saving
                ? "Recording…"
                : `Record ₹${Number(amount || 0).toLocaleString("en-IN")} Cash Payment`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending Approvals Tab ────────────────────────────────────────────────────
function PendingApprovalsTab({ setToast, refreshKey }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/fees/admin/pending-approvals");
      setPending(data || []);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await apiFetch(`/fees/admin/approve/${id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setToast({ msg: "Payment approved successfully!", type: "success" });
      load();
    } catch {
      setToast({ msg: "Failed to approve payment.", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionId(rejectModal);
    try {
      await apiFetch(`/fees/admin/reject/${rejectModal}`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectReason || "Rejected by admin" }),
      });
      setToast({ msg: "Payment rejected.", type: "success" });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch {
      setToast({ msg: "Failed to reject payment.", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );

  if (pending.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
        <CheckCircle size={40} className="mx-auto text-emerald-200 mb-3" />
        <p className="text-base font-semibold text-gray-500">
          No pending approvals
        </p>
        <p className="text-sm text-gray-400 mt-1">
          All payments are up to date
        </p>
      </div>
    );

  return (
    <>
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Reject Payment</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionId}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {actionId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Ban size={14} />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl ${avatarColor(p.student_name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                >
                  {getInitials(p.student_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {p.student_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Class {p.class}
                    {p.section ? `-${p.section}` : ""} · Roll{" "}
                    {p.roll_number || "—"}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right flex-shrink-0">
                <p className="text-xl font-bold text-gray-900 flex items-center gap-1 justify-center sm:justify-end">
                  <IndianRupee size={16} />
                  {Number(p.amount).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {p.razorpay_payment_id ? ` · ${p.razorpay_payment_id}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.receipt_url && (
                  <a
                    href={`${API_BASE}${p.receipt_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    title="View receipt"
                  >
                    <Eye size={15} />
                  </a>
                )}
                <button
                  onClick={() => setRejectModal(p.id)}
                  disabled={actionId === p.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  <Ban size={13} />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={actionId === p.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-60"
                >
                  {actionId === p.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <BadgeCheck size={13} />
                  )}
                  Approve
                </button>
              </div>
            </div>
            {p.receipt_url && !p.receipt_url.endsWith(".pdf") && (
              <div className="border-t border-gray-50 px-5 py-3 bg-gray-50/50 flex items-center gap-3">
                <img
                  src={`${API_BASE}${p.receipt_url}`}
                  alt="Receipt"
                  className="h-14 w-20 object-cover rounded-lg border border-gray-200"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-600">
                    Payment Receipt
                  </p>
                  {p.note && (
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      {p.note}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total: ₹{Number(p.total_fees || 0).toLocaleString("en-IN")}{" "}
                    · Already paid: ₹
                    {Number(p.already_paid || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── All Payments Tab ─────────────────────────────────────────────────────────
function AllPaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await apiFetch(`/fees/admin/all-payments${params}`);
      setPayments(data || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "approved", label: "Approved" },
          { key: "pending_approval", label: "Pending" },
          { key: "rejected", label: "Rejected" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filter === f.key
                ? "bg-violet-600 text-white border-transparent shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-violet-200"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto p-1.5 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-sm text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    "Student",
                    "Class",
                    "Amount",
                    "Date",
                    "Method",
                    "Status",
                    "Receipt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p, i) => {
                  const ps =
                    PAYMENT_STATUS[p.status] || PAYMENT_STATUS.approved;
                  const isCash = !p.razorpay_payment_id;
                  return (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg ${avatarColor(p.student_name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                          >
                            {getInitials(p.student_name)}
                          </div>
                          <span className="font-semibold text-gray-900 truncate max-w-[120px]">
                            {p.student_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {p.class}
                        {p.section ? `-${p.section}` : ""}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <span className="flex items-center gap-0.5">
                          <IndianRupee size={11} />
                          {Number(p.amount).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(p.paid_on || p.created_at).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCash
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-violet-50 text-violet-700 border-violet-200"
                          }`}
                        >
                          {isCash ? (
                            <Banknote size={10} />
                          ) : (
                            <CreditCard size={10} />
                          )}
                          {isCash ? "Cash" : "Razorpay"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ps.color}`}
                        >
                          {ps.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.receipt_url ? (
                          <a
                            href={`${API_BASE}${p.receipt_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-violet-600 hover:underline text-xs font-semibold"
                          >
                            <Eye size={12} /> View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TurnoverTab() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        academic_year: currentAcademicYear(),
        date_from: dateFrom,
        date_to: dateTo,
      });
      const response = await apiFetch(`/fees/stats?${params}`);
      setData(response.data);
    } catch {
      setError("Turnover report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const turnover = data?.turnover || {};
  const heads = data?.fee_heads || {};
  const currency = (value) =>
    `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="text-xs font-semibold text-gray-500">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="mt-1.5 block px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-gray-500">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="mt-1.5 block px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </label>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Apply
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          [
            "Turnover",
            currency(turnover.turnover),
            TrendingUp,
            "text-emerald-600",
          ],
          [
            "Transactions",
            turnover.transactions || 0,
            CreditCard,
            "text-violet-600",
          ],
          [
            "Average Payment",
            currency(turnover.average_payment),
            Banknote,
            "text-amber-600",
          ],
          [
            "Outstanding",
            currency(summary.total_pending),
            AlertCircle,
            "text-red-600",
          ],
        ].map(([label, value, Icon, color]) => (
          <div
            key={label}
            className="bg-white border border-gray-100 rounded-xl p-4"
          >
            <Icon size={17} className={`${color} mb-3`} />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 text-sm">
            Monthly Collection
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Approved payments within the selected dates.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.monthly || []}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => currency(value)} />
              <Bar dataKey="collected" fill="#ff9933" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">
            Payment Modes
          </h3>
          <div className="space-y-3">
            {(data?.payment_modes || []).map((mode) => (
              <div
                key={mode.mode}
                className="flex items-center justify-between border-b border-gray-50 pb-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 capitalize">
                    {mode.mode}
                  </p>
                  <p className="text-xs text-gray-400">
                    {mode.transactions} transactions
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {currency(mode.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">
              Class-wise Collection
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Class</th>
                  <th className="text-right px-4 py-3">Transactions</th>
                  <th className="text-right px-4 py-3">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.class_wise || []).map((row) => (
                  <tr key={`${row.class}-${row.section}`}>
                    <td className="px-4 py-3 font-semibold">
                      {row.class}
                      {row.section ? `-${row.section}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {row.transactions}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {currency(row.collected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">
            Fee-head Exposure
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Tuition", heads.tuition, GraduationCap],
              ["Library", heads.library, BookOpen],
              ["Transport", heads.transport, Bus],
              ["Hostel", heads.hostel, Hotel],
              ["Mess", heads.mess, Utensils],
              ["Other", heads.other, Wrench],
            ].map(([label, value, Icon]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-4">
                <Icon size={15} className="text-violet-600 mb-2" />
                <p className="text-sm font-bold text-gray-900">
                  {currency(value)}
                </p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminFeesPage() {
  const [activeTab, setActiveTab] = useState("manage");
  const [classes, setClasses] = useState([]);
  const [activeClassIdx, setActiveClassIdx] = useState(0);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/fees/classes");
      setClasses(data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const loadPendingCount = useCallback(async () => {
    try {
      const data = await apiFetch("/fees/admin/pending-approvals");
      setPendingCount((data || []).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount, refreshKey]);

  const activeClass = classes[activeClassIdx] || null;

  const loadStudents = useCallback(async () => {
    if (!activeClass) return;
    setStudentsLoading(true);
    try {
      const cls =
        activeClass.class || activeClass.grade || activeClass.class_name;
      const section = activeClass.section || "";
      const params = new URLSearchParams({
        class: cls,
        academic_year: currentAcademicYear(),
      });
      if (section) params.append("section", section);
      params.append("limit", "200");
      const data = await apiFetch(`/fees/students?${params}`);
      setStudents(data.data || []);
    } catch {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [activeClass]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleTransportUpdate = async (studentFeeId, transportFee) => {
    try {
      await apiFetch(`/fees/students/${studentFeeId}`, {
        method: "PATCH",
        body: JSON.stringify({ transport_fee: transportFee }),
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentFeeId
            ? {
                ...s,
                transport_fee: transportFee,
                total_fees:
                  Number(s.tuition_fee || 0) +
                  Number(s.library_fee || 0) +
                  Number(s.other_fee || 0) +
                  Number(s.hostel_fee || 0) +
                  Number(s.mess_fee || 0) +
                  transportFee,
              }
            : s,
        ),
      );
      setToast({ msg: "Transport fee updated!", type: "success" });
    } catch {
      setToast({ msg: "Failed to update transport fee.", type: "error" });
    }
  };

  const stats = useMemo(() => {
    const paid = students.filter((s) => s.status === "Paid").length;
    const pending = students.filter(
      (s) => s.status === "Pending" || !s.status,
    ).length;
    const overdue = students.filter((s) => s.status === "Overdue").length;
    const partial = students.filter((s) => s.status === "Partial").length;
    const totalCollected = students.reduce(
      (a, s) => a + Number(s.paid_amount || 0),
      0,
    );
    const totalDue = students.reduce(
      (a, s) => a + Number(s.total_fees || 0),
      0,
    );
    return { paid, pending, overdue, partial, totalCollected, totalDue };
  }, [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (filterStatus !== "All")
      list = list.filter((s) => (s.status || "Pending") === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.roll_no?.toString().includes(q),
      );
    }
    return list;
  }, [students, filterStatus, search]);

  const TABS = [
    { key: "manage", label: "Manage Fees", icon: GraduationCap },
    {
      key: "approvals",
      label: "Pending Approvals",
      icon: Clock,
      badge: pendingCount,
    },
    { key: "history", label: "All Payments", icon: CreditCard },
    { key: "turnover", label: "Turnover", icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {showCashModal && (
        <CashPaymentModal
          classes={classes}
          onClose={() => setShowCashModal(false)}
          onSuccess={() => {
            loadStudents();
            setRefreshKey((k) => k + 1);
            loadPendingCount();
          }}
          setToast={setToast}
        />
      )}

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Fees Management
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "manage" && (
                <>
                  <button
                    onClick={() => setShowCashModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-sm"
                  >
                    <Banknote size={14} />
                    Cash Payment
                  </button>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-48">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search students…"
                      className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="pl-10 lg:pl-0 flex gap-1 mt-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-white text-violet-600"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ── TAB: Manage Fees ── */}
          {activeTab === "manage" && (
            <>
              {loading ? (
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-64" />
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {classes.map((cls, i) => (
                    <button
                      key={cls.id || i}
                      onClick={() => {
                        setActiveClassIdx(i);
                        setSearch("");
                        setFilterStatus("All");
                        setShowFeeForm(false);
                      }}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        i === activeClassIdx
                          ? "bg-emerald-500 text-white border-transparent shadow-md"
                          : "bg-white text-gray-500 border-gray-100 hover:border-emerald-200"
                      }`}
                    >
                      Class {cls.grade || cls.class_name}
                      {cls.section ? `-${cls.section}` : ""}
                    </button>
                  ))}
                </div>
              )}

              {activeClass && (
                <>
                  <div>
                    <button
                      onClick={() => setShowFeeForm((v) => !v)}
                      className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition-all"
                    >
                      <IndianRupee size={14} />
                      {showFeeForm ? "Hide" : "Set / Update"} Base Fees for this
                      Class
                      {showFeeForm ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                    {showFeeForm && (
                      <div className="mt-3">
                        <ClassFeeForm
                          cls={activeClass}
                          onSaved={() => {
                            setShowFeeForm(false);
                            loadStudents();
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {!studentsLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Paid",
                          count: stats.paid,
                          color: "text-emerald-600",
                          bg: "bg-emerald-50",
                          icon: CheckCircle,
                        },
                        {
                          label: "Partial",
                          count: stats.partial,
                          color: "text-blue-600",
                          bg: "bg-blue-50",
                          icon: Clock,
                        },
                        {
                          label: "Pending",
                          count: stats.pending,
                          color: "text-amber-600",
                          bg: "bg-amber-50",
                          icon: Clock,
                        },
                        {
                          label: "Overdue",
                          count: stats.overdue,
                          color: "text-red-600",
                          bg: "bg-red-50",
                          icon: AlertCircle,
                        },
                      ].map(({ label, count, color, bg, icon: Icon }) => (
                        <button
                          key={label}
                          onClick={() =>
                            setFilterStatus(
                              filterStatus === label ? "All" : label,
                            )
                          }
                          className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 transition-all text-left ${
                            filterStatus === label
                              ? "ring-2 ring-emerald-300"
                              : "hover:shadow-md"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon size={16} className={color} />
                          </div>
                          <div>
                            <p
                              className={`text-xl font-bold ${color} leading-tight`}
                            >
                              {count}
                            </p>
                            <p className="text-xs text-gray-400">{label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!studentsLoading && stats.totalDue > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">
                          Total Collected
                        </p>
                        <p className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                          <IndianRupee size={14} />
                          {stats.totalCollected.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">
                          Total Due
                        </p>
                        <p className="text-lg font-bold text-gray-800 flex items-center gap-1">
                          <IndianRupee size={14} />
                          {stats.totalDue.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex-1 min-w-32">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (stats.totalCollected / stats.totalDue) * 100).toFixed(1)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {(
                            (stats.totalCollected / stats.totalDue) *
                            100
                          ).toFixed(1)}
                          % collected
                        </p>
                      </div>
                    </div>
                  )}

                  {studentsLoading ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="h-12 bg-gray-100 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : students.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="text-sm font-semibold text-gray-500">
                        First,Set the base fees for this class.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                        <Users size={14} className="text-violet-500" />
                        <span className="text-xs font-semibold text-gray-500">
                          {filtered.length} students
                        </span>
                      </div>
                      <table className="w-full text-sm min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            {[
                              "Student",
                              "Roll No.",
                              "Tuition",
                              "Transport Fee",
                              "Total",
                              "Paid",
                              "Remaining",
                              "Status",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filtered.length > 0 ? (
                            filtered.map((s) => (
                              <StudentTransportRow
                                key={s.id}
                                student={s}
                                onUpdate={handleTransportUpdate}
                              />
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-14 text-center text-sm text-gray-400"
                              >
                                No students found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "turnover" && <TurnoverTab />}

          {activeTab === "approvals" && (
            <PendingApprovalsTab setToast={setToast} refreshKey={refreshKey} />
          )}

          {activeTab === "history" && <AllPaymentsTab />}
        </div>
      </main>

      <Toast
        msg={toast.msg}
        type={toast.type}
        onDismiss={() => setToast({ msg: "", type: "success" })}
      />
    </div>
  );
}
