// "use client";

// import { useState, useEffect, useCallback, useMemo } from "react";
// import TeacherSidebar from "@/components/TeacherSidebar";
// import {
//   Search, CheckCircle, Clock, AlertCircle, Loader2,
//   Bus, IndianRupee, Save, ChevronDown, X,
// } from "lucide-react";

// const getToken = () => {
//   if (typeof window === "undefined") return null;
//   const m = document.cookie.match(/(^| )token=([^;]+)/);
//   return m ? m[2] : null;
// };

// const apiFetch = (path, opts = {}) =>
//   fetch(`/api${path}`, {
//     headers: {
//       Authorization: `Bearer ${getToken()}`,
//       ...(opts.body ? { "Content-Type": "application/json" } : {}),
//     },
//     ...opts,
//   }).then((r) => {
//     if (!r.ok) throw new Error(`${r.status}`);
//     return r.json();
//   });

// const AVATAR_COLORS = [
//   "bg-blue-500","bg-violet-500","bg-rose-500","bg-amber-500",
//   "bg-emerald-500","bg-cyan-500","bg-pink-500","bg-indigo-500",
// ];
// function getInitials(name = "") {
//   const p = name.trim().split(" ").filter(Boolean);
//   if (!p.length) return "?";
//   return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
// }
// function avatarColor(name = "") {
//   let h = 0;
//   for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
//   return AVATAR_COLORS[h];
// }

// const STATUS_MAP = {
//   Paid:    { bg:"bg-emerald-50", text:"text-emerald-700", ring:"ring-emerald-200", dot:"bg-emerald-500", icon: CheckCircle },
//   Pending: { bg:"bg-amber-50",   text:"text-amber-700",   ring:"ring-amber-200",   dot:"bg-amber-500",   icon: Clock       },
//   Partial: { bg:"bg-blue-50",    text:"text-blue-700",    ring:"ring-blue-200",    dot:"bg-blue-500",    icon: Clock       },
//   Overdue: { bg:"bg-red-50",     text:"text-red-700",     ring:"ring-red-200",     dot:"bg-red-500",     icon: AlertCircle },
// };

// function FeeBadge({ status }) {
//   const s = STATUS_MAP[status] || STATUS_MAP.Pending;
//   return (
//     <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
//       <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
//       {status || "Pending"}
//     </span>
//   );
// }

// function Toast({ msg, type, onDismiss }) {
//   useEffect(() => {
//     if (!msg) return;
//     const t = setTimeout(onDismiss, 3000);
//     return () => clearTimeout(t);
//   }, [msg, onDismiss]);
//   if (!msg) return null;
//   return (
//     <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2 ${
//       type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
//     }`}>
//       {type === "error" ? "❌" : "✅"} {msg}
//       <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">✕</button>
//     </div>
//   );
// }

// // ─── Payment Modal ─────────────────────────────────────────────────────────────
// function PaymentModal({ student, onClose, onSaved }) {
//   const [amount,  setAmount]  = useState("");
//   const [note,    setNote]    = useState("");
//   const [saving,  setSaving]  = useState(false);
//   const [error,   setError]   = useState("");

//   const remaining = Number(student.total_fees || 0) - Number(student.paid_amount || 0);

//   const handleSave = async () => {
//     if (!amount || Number(amount) <= 0) { setError("Valid amount daalo."); return; }
//     if (Number(amount) > remaining)     { setError(`Max ₹${remaining.toLocaleString("en-IN")} add kar sakte ho.`); return; }
//     setSaving(true);
//     try {
//       await apiFetch(`/fees/students/${student.id}`, {
//         method: "PATCH",
//         body: JSON.stringify({ payment_amount: Number(amount), note }),
//       });
//       onSaved();
//     } catch {
//       setError("Save failed. Try again.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
//         <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
//           <div>
//             <h2 className="font-bold text-gray-900">Add Payment</h2>
//             <p className="text-xs text-gray-400 mt-0.5">{student.name}</p>
//           </div>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
//         </div>

//         <div className="px-5 py-4 space-y-4">
//           {/* Summary */}
//           <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
//             <div>
//               <p className="text-xs text-gray-400">Total</p>
//               <p className="text-sm font-bold text-gray-800">₹{Number(student.total_fees||0).toLocaleString("en-IN")}</p>
//             </div>
//             <div>
//               <p className="text-xs text-gray-400">Paid</p>
//               <p className="text-sm font-bold text-emerald-600">₹{Number(student.paid_amount||0).toLocaleString("en-IN")}</p>
//             </div>
//             <div>
//               <p className="text-xs text-gray-400">Remaining</p>
//               <p className="text-sm font-bold text-red-500">₹{remaining.toLocaleString("en-IN")}</p>
//             </div>
//           </div>

//           {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

//           <div>
//             <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Amount (₹) *</label>
//             <div className="relative">
//               <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
//               <input
//                 type="number" min="1" max={remaining}
//                 value={amount} onChange={e => setAmount(e.target.value)}
//                 placeholder="0"
//                 className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
//               />
//             </div>
//           </div>

//           <div>
//             <label className="text-xs font-semibold text-gray-500 mb-1 block">Note (optional)</label>
//             <input
//               value={note} onChange={e => setNote(e.target.value)}
//               placeholder="e.g. Cash payment, April installment"
//               className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
//             />
//           </div>
//         </div>

//         <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
//           <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
//             Cancel
//           </button>
//           <button onClick={handleSave} disabled={saving}
//             className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2">
//             {saving ? <Loader2 size={14} className="animate-spin"/> : null}
//             Save Payment
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Student Row (Desktop) ─────────────────────────────────────────────────────
// function StudentFeeRow({ student, onUpdate, onPayment }) {
//   const [status,    setStatus]    = useState(student.status || "Pending");
//   const [transport, setTransport] = useState(String(student.transport_fee || "0"));
//   const [saving,    setSaving]    = useState(false);
//   const [open,      setOpen]      = useState(false);

//   const statusDirty    = status    !== (student.status || "Pending");
//   const transportDirty = transport !== String(student.transport_fee || "0");
//   const isDirty = statusDirty || transportDirty;

//   const paid      = Number(student.paid_amount || 0);
//   const total     = Number(student.tuition_fee || 0) + Number(student.library_fee || 0) +
//                     Number(student.other_fee || 0) + Number(transport || 0);
//   const remaining = total - paid;
//   const percent   = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

//   const handleSave = async () => {
//     setSaving(true);
//     await onUpdate(student.id, {
//       status:        statusDirty    ? status            : undefined,
//       transport_fee: transportDirty ? Number(transport) : undefined,
//     });
//     setSaving(false);
//   };

//   return (
//     <>
//       <tr className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${open ? "bg-gray-50/40" : ""}`}>
//         {/* Student */}
//         <td className="px-4 py-3" onClick={() => setOpen(o => !o)}>
//           <div className="flex items-center gap-3">
//             <div className={`w-8 h-8 rounded-xl ${avatarColor(student.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
//               {getInitials(student.name)}
//             </div>
//             <div>
//               <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
//               <p className="text-xs text-gray-400">{student.email}</p>
//             </div>
//           </div>
//         </td>

//         {/* Roll */}
//         <td className="px-4 py-3 font-mono text-xs text-gray-500">{student.roll_number || "—"}</td>

//         {/* Paid / Remaining */}
//         <td className="px-4 py-3">
//           <div className="space-y-1">
//             <div className="flex gap-3 text-xs">
//               <span className="text-emerald-600 font-semibold">✓ ₹{paid.toLocaleString("en-IN")}</span>
//               <span className="text-red-500 font-semibold">✗ ₹{remaining > 0 ? remaining.toLocaleString("en-IN") : 0}</span>
//             </div>
//             <div className="h-1.5 bg-gray-100 rounded-full w-28 overflow-hidden">
//               <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${percent}%` }}/>
//             </div>
//           </div>
//         </td>

//         {/* Transport */}
//         <td className="px-4 py-3">
//           <div className="relative w-24">
//             <IndianRupee size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
//             <input
//               type="number" min="0"
//               value={transport}
//               onChange={e => setTransport(e.target.value)}
//               onClick={e => e.stopPropagation()}
//               className={`w-full pl-6 pr-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
//                 transportDirty ? "border-blue-300 bg-blue-50" : "border-gray-200"
//               }`}
//             />
//           </div>
//         </td>

//         {/* Total */}
//         <td className="px-4 py-3 text-sm font-semibold text-gray-800">
//           ₹{total.toLocaleString("en-IN")}
//         </td>

//         {/* Status badge */}
//         <td className="px-4 py-3"><FeeBadge status={student.status}/></td>

//         {/* Update Status */}
//         <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
//           <select
//             value={status}
//             onChange={e => setStatus(e.target.value)}
//             className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer ${
//               status === "Paid"    ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
//               status === "Overdue" ? "bg-red-50 border-red-200 text-red-700"             :
//               status === "Partial" ? "bg-blue-50 border-blue-200 text-blue-700"          :
//                                      "bg-amber-50 border-amber-200 text-amber-700"
//             }`}
//           >
//             <option value="Paid">Paid</option>
//             <option value="Pending">Pending</option>
//             <option value="Partial">Partial</option>
//             <option value="Overdue">Overdue</option>
//           </select>
//         </td>

//         {/* Actions */}
//         <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={() => onPayment(student)}
//               className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-semibold transition-all"
//             >
//               + Pay
//             </button>
//             {isDirty && (
//               <button onClick={handleSave} disabled={saving}
//                 className="flex items-center gap-1 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-60">
//                 {saving ? <Loader2 size={11} className="animate-spin"/> : <Save size={11}/>}
//                 Save
//               </button>
//             )}
//           </div>
//         </td>
//       </tr>

//       {/* Expanded fee breakdown */}
//       {open && (
//         <tr className="bg-gray-50/60">
//           <td colSpan={8} className="px-4 pb-4">
//             <div className="grid grid-cols-4 gap-3 pt-3">
//               {[
//                 { label: "Tuition",   val: student.tuition_fee,  color: "text-indigo-600" },
//                 { label: "Library",   val: student.library_fee,  color: "text-amber-600"  },
//                 { label: "Other",     val: student.other_fee,    color: "text-gray-600"   },
//                 { label: "Transport", val: transport,            color: "text-blue-600"   },
//               ].map(({ label, val, color }) => (
//                 <div key={label} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-center">
//                   <p className="text-xs text-gray-400 mb-0.5">{label}</p>
//                   <p className={`text-sm font-bold ${color}`}>₹{Number(val||0).toLocaleString("en-IN")}</p>
//                 </div>
//               ))}
//             </div>
//           </td>
//         </tr>
//       )}
//     </>
//   );
// }

// // ─── Mobile Card ───────────────────────────────────────────────────────────────
// function StudentFeeCardMobile({ student, onUpdate, onPayment }) {
//   const [status,    setStatus]    = useState(student.status || "Pending");
//   const [transport, setTransport] = useState(String(student.transport_fee || "0"));
//   const [saving,    setSaving]    = useState(false);

//   const isDirty = status !== (student.status || "Pending") ||
//                   transport !== String(student.transport_fee || "0");

//   const paid      = Number(student.paid_amount || 0);
//   const total     = Number(student.tuition_fee || 0) + Number(student.library_fee || 0) +
//                     Number(student.other_fee || 0) + Number(transport || 0);
//   const remaining = total - paid;
//   const percent   = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

//   const handleSave = async () => {
//     setSaving(true);
//     await onUpdate(student.id, {
//       status:        status    !== (student.status || "Pending")         ? status            : undefined,
//       transport_fee: transport !== String(student.transport_fee || "0")  ? Number(transport) : undefined,
//     });
//     setSaving(false);
//   };

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
//       {/* Header */}
//       <div className="flex items-start gap-3">
//         <div className={`w-10 h-10 rounded-xl ${avatarColor(student.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
//           {getInitials(student.name)}
//         </div>
//         <div className="flex-1 min-w-0">
//           <p className="font-semibold text-gray-900 truncate">{student.name}</p>
//           <p className="text-xs text-gray-400">Roll {student.roll_number || "—"}</p>
//         </div>
//         <FeeBadge status={student.status}/>
//       </div>

//       {/* Fee summary */}
//       <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
//         <div>
//           <p className="text-[10px] text-gray-400">Total</p>
//           <p className="text-xs font-bold text-gray-800">₹{total.toLocaleString("en-IN")}</p>
//         </div>
//         <div>
//           <p className="text-[10px] text-gray-400">Paid</p>
//           <p className="text-xs font-bold text-emerald-600">₹{paid.toLocaleString("en-IN")}</p>
//         </div>
//         <div>
//           <p className="text-[10px] text-gray-400">Remaining</p>
//           <p className="text-xs font-bold text-red-500">₹{remaining > 0 ? remaining.toLocaleString("en-IN") : 0}</p>
//         </div>
//       </div>

//       {/* Progress bar */}
//       <div>
//         <div className="flex justify-between text-[10px] text-gray-400 mb-1">
//           <span>Payment Progress</span><span>{percent.toFixed(0)}%</span>
//         </div>
//         <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
//           <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${percent}%` }}/>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-2">
//         {/* Transport */}
//         <div className="bg-blue-50 rounded-xl px-3 py-2">
//           <p className="text-[10px] text-blue-400 mb-1 flex items-center gap-1"><Bus size={10}/> Transport Fee</p>
//           <div className="relative">
//             <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
//             <input type="number" min="0" value={transport} onChange={e => setTransport(e.target.value)}
//               className="w-full pl-5 pr-2 py-1 text-xs border border-blue-100 rounded-lg focus:outline-none bg-white"/>
//           </div>
//         </div>

//         {/* Status */}
//         <div className="bg-gray-50 rounded-xl px-3 py-2">
//           <p className="text-[10px] text-gray-400 mb-1">Update Status</p>
//           <select value={status} onChange={e => setStatus(e.target.value)}
//             className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white">
//             <option value="Paid">Paid</option>
//             <option value="Pending">Pending</option>
//             <option value="Partial">Partial</option>
//             <option value="Overdue">Overdue</option>
//           </select>
//         </div>
//       </div>

//       <div className="flex gap-2">
//         <button onClick={() => onPayment(student)}
//           className="flex-1 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
//           + Add Payment
//         </button>
//         {isDirty && (
//           <button onClick={handleSave} disabled={saving}
//             className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold">
//             {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
//             Save
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Main Page ─────────────────────────────────────────────────────────────────
// export default function TeacherFeesPage() {
//   const [students,        setStudents]        = useState([]);
//   const [classes,         setClasses]         = useState([]);
//   const [loading,         setLoading]         = useState(true);
//   const [studentsLoading, setStudentsLoading] = useState(false);
//   const [error,           setError]           = useState("");
//   const [toast,           setToast]           = useState({ msg: "", type: "success" });
//   const [search,          setSearch]          = useState("");
//   const [filterFee,       setFilterFee]       = useState("All");
//   const [activeClassIdx,  setActiveClassIdx]  = useState(0);
//   const [payModal,        setPayModal]        = useState(null);

//   const loadClasses = useCallback(async () => {
//     setLoading(true);
//     try {
//       const data = await apiFetch("/teacher/classes");
//       setClasses(data || []);
//     } catch {
//       setError("Classes load nahi ho payi.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadClasses(); }, [loadClasses]);

//   const activeClass = classes[activeClassIdx] || null;

//   const loadStudents = useCallback(async () => {
//     if (!activeClass) return;
//     setStudentsLoading(true);
//     try {
//       const cls = activeClass.grade ||
//             (activeClass.class_name || "").replace(/^Class\s+/i, "").trim();
//       const section = activeClass.section || "";
//       const params  = new URLSearchParams({ class: cls, academic_year: "2024-25", limit: "200" });
//       if (section) params.append("section", section);
//       const data = await apiFetch(`/fees/students?${params}`);
//       setStudents(data.data || []);
//     } catch {
//       setStudents([]);
//     } finally {
//       setStudentsLoading(false);
//     }
//   }, [activeClass]);

//   useEffect(() => { loadStudents(); }, [loadStudents]);

//   const handleUpdate = async (studentFeeId, changes) => {
//     try {
//       const res = await apiFetch(`/fees/students/${studentFeeId}`, {
//         method: "PATCH",
//         body: JSON.stringify(changes),
//       });
//       // ✅ Updated data server se wapas lo
//       setStudents(prev =>
//         prev.map(s => s.id === studentFeeId ? { ...s, ...res.data } : s)
//       );
//       setToast({ msg: "Updated successfully!", type: "success" });
//     } catch {
//       setToast({ msg: "Update failed. Try again.", type: "error" });
//     }
//   };

//   const handlePaymentSaved = () => {
//     setPayModal(null);
//     setToast({ msg: "Payment saved!", type: "success" });
//     loadStudents(); // Refresh
//   };

//   // Stats
//   const totalCollected = students.reduce((s, x) => s + Number(x.paid_amount || 0), 0);
//   const totalPending   = students.reduce((s, x) => s + (Number(x.total_fees || 0) - Number(x.paid_amount || 0)), 0);
//   const paid    = students.filter(s => s.status === "Paid").length;
//   const pending = students.filter(s => !s.status || s.status === "Pending").length;
//   const overdue = students.filter(s => s.status === "Overdue").length;
//   const partial = students.filter(s => s.status === "Partial").length;

//   const filtered = useMemo(() => {
//     let list = students;
//     if (filterFee !== "All") list = list.filter(s => (s.status || "Pending") === filterFee);
//     if (search) {
//       const q = search.toLowerCase();
//       list = list.filter(s => s.name?.toLowerCase().includes(q) || s.roll_number?.toString().includes(q));
//     }
//     return list;
//   }, [students, filterFee, search]);

//   return (
//     <div className="flex min-h-screen bg-gray-50">
//       <TeacherSidebar />

//       <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
//         <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
//           <div className="pl-10 lg:pl-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
//             <div>
//               <h1 className="text-xl font-bold text-gray-900">Fees Management</h1>
//               <p className="text-sm text-gray-400">Payment record karein · Status update karein</p>
//             </div>
//             <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-60">
//               <Search size={14} className="text-gray-400 flex-shrink-0"/>
//               <input value={search} onChange={e => setSearch(e.target.value)}
//                 placeholder="Search students…"
//                 className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"/>
//             </div>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
//           {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

//           {/* Class Switcher */}
//           {!loading && classes.length > 0 && (
//             <div className="flex gap-2 overflow-x-auto pb-1">
//               {classes.map((cls, i) => (
//                 <button key={cls.id || i}
//                   onClick={() => { setActiveClassIdx(i); setSearch(""); setFilterFee("All"); }}
//                   className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
//                     i === activeClassIdx ? "bg-emerald-500 text-white border-transparent shadow-md" : "bg-white text-gray-500 border-gray-100"
//                   }`}>
//                   Class {cls.grade || cls.class_name}{cls.section ? `-${cls.section}` : ""}
//                 </button>
//               ))}
//             </div>
//           )}

//           {/* Collection Summary */}
//           {!studentsLoading && activeClass && students.length > 0 && (
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
//                 <p className="text-xs text-gray-400 mb-1">Total Collected</p>
//                 <p className="text-xl font-bold text-emerald-600">₹{totalCollected.toLocaleString("en-IN")}</p>
//               </div>
//               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
//                 <p className="text-xs text-gray-400 mb-1">Total Pending</p>
//                 <p className="text-xl font-bold text-red-500">₹{totalPending.toLocaleString("en-IN")}</p>
//               </div>
//               {[
//                 { label:"Paid",    count: paid,    color:"text-emerald-600", bg:"bg-emerald-50", icon: CheckCircle },
//                 { label:"Overdue", count: overdue, color:"text-red-600",     bg:"bg-red-50",     icon: AlertCircle },
//               ].map(({ label, count, color, bg, icon: Icon }) => (
//                 <button key={label}
//                   onClick={() => setFilterFee(filterFee === label ? "All" : label)}
//                   className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 transition-all ${
//                     filterFee === label ? "ring-2 ring-emerald-300" : "hover:shadow-md"
//                   }`}>
//                   <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
//                     <Icon size={16} className={color}/>
//                   </div>
//                   <div className="text-left">
//                     <p className={`text-xl font-bold ${color} leading-tight`}>{count}</p>
//                     <p className="text-xs text-gray-400">{label}</p>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           )}

//           {/* Filter pills */}
//           {!studentsLoading && students.length > 0 && (
//             <div className="flex gap-2 flex-wrap">
//               {["All","Paid","Pending","Partial","Overdue"].map(f => (
//                 <button key={f} onClick={() => setFilterFee(f)}
//                   className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
//                     filterFee === f ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
//                   }`}>
//                   {f} {f !== "All" && `(${students.filter(s=>(s.status||"Pending")===f).length})`}
//                 </button>
//               ))}
//             </div>
//           )}

//           {studentsLoading ? (
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
//               {[...Array(5)].map((_,i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}
//             </div>
//           ) : !activeClass ? (
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
//               <p className="text-5xl mb-3">🏫</p>
//               <p className="text-sm font-semibold text-gray-500">No class assigned</p>
//             </div>
//           ) : (
//             <>
//               {/* Desktop Table */}
//               <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
//                 <table className="w-full text-sm min-w-[900px]">
//                   <thead className="bg-gray-50 border-b border-gray-100">
//                     <tr>
//                       {["Student","Roll","Paid / Remaining","Transport Fee 🚌","Total","Status","Update","Action"].map(h => (
//                         <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-50">
//                     {filtered.length > 0 ? filtered.map(s => (
//                       <StudentFeeRow key={s.id} student={s} onUpdate={handleUpdate} onPayment={setPayModal}/>
//                     )) : (
//                       <tr><td colSpan={8} className="py-16 text-center">
//                         <p className="text-3xl mb-2">🔍</p>
//                         <p className="text-sm text-gray-500">No students found</p>
//                       </td></tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Mobile Cards */}
//               <div className="sm:hidden space-y-3">
//                 {filtered.length > 0 ? filtered.map(s => (
//                   <StudentFeeCardMobile key={s.id} student={s} onUpdate={handleUpdate} onPayment={setPayModal}/>
//                 )) : (
//                   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
//                     <p className="text-3xl mb-2">🔍</p>
//                     <p className="text-sm text-gray-500">No students found</p>
//                   </div>
//                 )}
//               </div>
//             </>
//           )}
//         </div>
//       </main>

//       {payModal && (
//         <PaymentModal student={payModal} onClose={() => setPayModal(null)} onSaved={handlePaymentSaved}/>
//       )}

//       <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast({ msg:"", type:"success" })}/>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TeacherSidebar from "@/components/TeacherSidebar";
import { apiFetch } from "@/lib/api";
import {
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  ChevronDown,
  Users,
} from "lucide-react";

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

export default function TeacherFeesPage() {
  const [classes, setClasses] = useState([]);
  const [activeClassIdx, setActiveClassIdx] = useState(0);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [classFilter, setClassFilter] = useState(""); // for dropdown on mobile

  // Load classes
  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/teacher/classes");
      setClasses(Array.isArray(data) ? data : []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

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
        academic_year: "2024-25",
        limit: "200",
      });
      if (section) params.append("section", section);
      const data = await apiFetch(`/fees/students?${params}`);
      setStudents(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [activeClass]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const stats = useMemo(() => {
    const paid = students.filter((s) => s.status === "Paid").length;
    const pending = students.filter(
      (s) => s.status === "Pending" || !s.status,
    ).length;
    const partial = students.filter((s) => s.status === "Partial").length;
    const totalCollected = students.reduce(
      (a, s) => a + Number(s.paid_amount || 0),
      0,
    );
    const totalDue = students.reduce(
      (a, s) => a + Number(s.total_fees || 0),
      0,
    );
    const totalRemaining = totalDue - totalCollected;
    return { paid, pending, partial, totalCollected, totalDue, totalRemaining };
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
          String(s.roll_no || s.roll_number || "").includes(q),
      );
    }
    return list;
  }, [students, filterStatus, search]);

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Student Fees Overview
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Read-only · Academic Year 2024-25
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-56">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students…"
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
                />
              </div>
              <button
                onClick={loadStudents}
                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw
                  size={14}
                  className={studentsLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Class Tabs */}
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
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    i === activeClassIdx
                      ? "bg-violet-600 text-white border-transparent shadow-md"
                      : "bg-white text-gray-500 border-gray-100 hover:border-violet-200"
                  }`}
                >
                  Class {cls.grade || cls.class_name}
                  {cls.section ? `-${cls.section}` : ""}
                </button>
              ))}
            </div>
          )}

          {activeClass && !studentsLoading && students.length > 0 && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Collected</p>
                  <p className="text-xl font-bold text-emerald-600 flex items-center gap-1">
                    <IndianRupee size={14} />
                    {stats.totalCollected.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Remaining</p>
                  <p className="text-xl font-bold text-red-500 flex items-center gap-1">
                    <IndianRupee size={14} />
                    {stats.totalRemaining.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 mb-1">Fully Paid</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {stats.paid}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      students
                    </span>
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    Pending / Partial
                  </p>
                  <p className="text-xl font-bold text-amber-600">
                    {stats.pending + stats.partial}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      students
                    </span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {stats.totalDue > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500">
                      Collection Progress
                    </p>
                    <p className="text-xs font-bold text-emerald-600">
                      {((stats.totalCollected / stats.totalDue) * 100).toFixed(
                        1,
                      )}
                      %
                    </p>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (stats.totalCollected / stats.totalDue) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                    <span>
                      ₹{stats.totalCollected.toLocaleString("en-IN")} collected
                    </span>
                    <span>₹{stats.totalDue.toLocaleString("en-IN")} total</span>
                  </div>
                </div>
              )}

              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {["All", "Paid", "Partial", "Pending", "Overdue"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      filterStatus === s
                        ? "bg-violet-600 text-white border-transparent shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:border-violet-200"
                    }`}
                  >
                    {s}
                    {s !== "All" && (
                      <span className="ml-1 text-[10px] opacity-70">
                        (
                        {
                          students.filter(
                            (st) => (st.status || "Pending") === s,
                          ).length
                        }
                        )
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-400 self-center">
                  {filtered.length} students
                </span>
              </div>
            </>
          )}

          {/* Student List */}
          {studentsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : students.length === 0 && activeClass ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
              <Users size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-500">
                No fee records for this class
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Admin needs to set fees for this class first
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {[
                        "Student",
                        "Roll No.",
                        "Total Fees",
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
                      filtered.map((s) => {
                        const remaining =
                          Number(s.total_fees || 0) -
                          Number(s.paid_amount || 0);
                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-gray-50/60 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl ${avatarColor(s.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                                >
                                  {getInitials(s.name)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {s.name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {s.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {s.roll_no || s.roll_number || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-800 flex items-center gap-0.5">
                                <IndianRupee
                                  size={12}
                                  className="text-gray-400"
                                />
                                {Number(s.total_fees || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-emerald-600 flex items-center gap-0.5">
                                <IndianRupee size={12} />
                                {Number(s.paid_amount || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div
                                className={`text-sm font-semibold flex items-center gap-0.5 ${remaining > 0 ? "text-red-500" : "text-emerald-500"}`}
                              >
                                <IndianRupee size={12} />
                                {remaining.toLocaleString("en-IN")}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={s.status} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-14 text-center text-sm text-gray-400"
                        >
                          No students match the filter
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {filtered.map((s) => {
                  const remaining =
                    Number(s.total_fees || 0) - Number(s.paid_amount || 0);
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${avatarColor(s.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Roll {s.roll_no || s.roll_number || "—"}
                          </p>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-xl px-2 py-2">
                          <p className="text-[10px] text-gray-400 mb-0.5">
                            Total
                          </p>
                          <p className="text-xs font-bold text-gray-800">
                            ₹{Number(s.total_fees || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl px-2 py-2">
                          <p className="text-[10px] text-gray-400 mb-0.5">
                            Paid
                          </p>
                          <p className="text-xs font-bold text-emerald-600">
                            ₹
                            {Number(s.paid_amount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div
                          className={`rounded-xl px-2 py-2 ${remaining > 0 ? "bg-red-50" : "bg-emerald-50"}`}
                        >
                          <p className="text-[10px] text-gray-400 mb-0.5">
                            Remaining
                          </p>
                          <p
                            className={`text-xs font-bold ${remaining > 0 ? "text-red-500" : "text-emerald-500"}`}
                          >
                            ₹{remaining.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
