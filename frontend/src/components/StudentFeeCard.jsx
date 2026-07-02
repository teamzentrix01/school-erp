// "use client";

// /**
//  * StudentFeeCard.jsx
//  *
//  * Student dashboard pe apni fees ka breakdown dikhata hai.
//  * Transport fee alag row mein dikh'ta hai agar assigned hai.
//  *
//  * Usage:
//  *   <StudentFeeCard studentId={user.student_id} academicYear="2024-25" />
//  */

// import { useState, useEffect } from "react";
// import {
//   IndianRupee, CheckCircle, Clock, AlertCircle,
//   Bus, BookOpen, GraduationCap, Wrench, Loader2,
// } from "lucide-react";

// const getToken = () => {
//   if (typeof window === "undefined") return null;
//   const m = document.cookie.match(/(^| )token=([^;]+)/);
//   return m ? m[2] : null;
// };

// const apiFetch = (path) =>
//   fetch(`/api${path}`, {
//     headers: { Authorization: `Bearer ${getToken()}` },
//   }).then((r) => {
//     if (!r.ok) throw new Error(`${r.status}`);
//     return r.json();
//   });

// const STATUS_CONFIG = {
//   Paid:    { label:"Paid",    bg:"bg-emerald-50", text:"text-emerald-700", ring:"ring-emerald-200", dot:"bg-emerald-500", icon: CheckCircle, bar:"bg-emerald-400" },
//   Partial: { label:"Partial", bg:"bg-blue-50",    text:"text-blue-700",   ring:"ring-blue-200",   dot:"bg-blue-500",   icon: Clock,        bar:"bg-blue-400"   },
//   Pending: { label:"Pending", bg:"bg-amber-50",   text:"text-amber-700",  ring:"ring-amber-200",  dot:"bg-amber-500",  icon: Clock,        bar:"bg-amber-400"  },
//   Overdue: { label:"Overdue", bg:"bg-red-50",     text:"text-red-700",    ring:"ring-red-200",    dot:"bg-red-500",    icon: AlertCircle,  bar:"bg-red-400"    },
// };

// function StatusBadge({ status }) {
//   const s = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
//   const Icon = s.icon;
//   return (
//     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
//       <Icon size={12} />
//       {s.label}
//     </span>
//   );
// }

// export default function StudentFeeCard({ studentId, academicYear = "2024-25" }) {
//   const [fee,     setFee]     = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error,   setError]   = useState("");

//   useEffect(() => {
//     if (!studentId) return;
//     setLoading(true);
//     // Fetch from student-facing fees endpoint
//     apiFetch(`/student/fees?academic_year=${academicYear}`)
//       .then(data => {
//         setFee(data.data || data);
//         setLoading(false);
//       })
//       .catch(() => {
//         setError("Fee details load nahi ho payi.");
//         setLoading(false);
//       });
//   }, [studentId, academicYear]);

//   if (loading) {
//     return (
//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
//         <Loader2 size={16} className="animate-spin" /> Loading fee details…
//       </div>
//     );
//   }

//   if (error || !fee) {
//     return (
//       <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
//         {error || "Koi fee record nahi mila."}
//       </div>
//     );
//   }

//   const status  = fee.status || "Pending";
//   const cfg     = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
//   const percent = fee.total_fees > 0
//     ? Math.min(100, (Number(fee.paid_amount) / Number(fee.total_fees)) * 100)
//     : 0;
//   const balance = Number(fee.total_fees) - Number(fee.paid_amount);

//   // Fee breakdown rows — only show if > 0
//   const breakdown = [
//     { label: "Tuition Fee",   value: fee.tuition_fee,   icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-50" },
//     { label: "Library Fee",   value: fee.library_fee,   icon: BookOpen,      color: "text-amber-500",  bg: "bg-amber-50"  },
//     { label: "Other Fee",     value: fee.other_fee,     icon: Wrench,        color: "text-gray-500",   bg: "bg-gray-50"   },
//     { label: "Transport Fee", value: fee.transport_fee, icon: Bus,           color: "text-blue-500",   bg: "bg-blue-50",  highlight: true },
//   ].filter(r => Number(r.value) > 0);

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//       {/* Top banner */}
//       <div className={`${cfg.bg} px-5 py-4 border-b ${cfg.ring.replace("ring-","border-")}`}>
//         <div className="flex items-start justify-between gap-3">
//           <div>
//             <p className="text-xs font-semibold text-gray-500 mb-1">Fee Status · {academicYear}</p>
//             <StatusBadge status={status} />
//           </div>
//           <div className="text-right">
//             <p className="text-xs text-gray-400 mb-0.5">Total Fees</p>
//             <p className={`text-2xl font-bold ${cfg.text} flex items-center gap-1`}>
//               <IndianRupee size={16} />
//               {Number(fee.total_fees).toLocaleString("en-IN")}
//             </p>
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="mt-3">
//           <div className="flex justify-between text-xs text-gray-500 mb-1">
//             <span>Paid: ₹{Number(fee.paid_amount).toLocaleString("en-IN")}</span>
//             <span>{percent.toFixed(0)}%</span>
//           </div>
//           <div className="h-2 bg-white/60 rounded-full overflow-hidden">
//             <div
//               className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
//               style={{ width: `${percent}%` }}
//             />
//           </div>
//           {balance > 0 && (
//             <p className="text-xs text-gray-500 mt-1">
//               Balance due: <span className="font-semibold text-gray-700">₹{balance.toLocaleString("en-IN")}</span>
//               {fee.due_date && (
//                 <> · Due: <span className="font-semibold">{new Date(fee.due_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</span></>
//               )}
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Fee Breakdown */}
//       {breakdown.length > 0 && (
//         <div className="px-5 py-4">
//           <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Fee Breakdown</p>
//           <div className="space-y-2">
//             {breakdown.map(({ label, value, icon: Icon, color, bg, highlight }) => (
//               <div
//                 key={label}
//                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${highlight ? "border border-blue-100 bg-blue-50/50" : "bg-gray-50"}`}
//               >
//                 <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
//                   <Icon size={13} className={color} />
//                 </div>
//                 <span className={`text-sm flex-1 ${highlight ? "font-semibold text-blue-700" : "text-gray-700"}`}>
//                   {label}
//                   {highlight && (
//                     <span className="ml-1.5 text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
//                       Assigned
//                     </span>
//                   )}
//                 </span>
//                 <span className={`text-sm font-bold ${highlight ? "text-blue-700" : "text-gray-900"} flex items-center gap-0.5`}>
//                   <IndianRupee size={11} />
//                   {Number(value).toLocaleString("en-IN")}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Payment history (if any) */}
//       {fee.payments?.length > 0 && (
//         <div className="px-5 pb-4 border-t border-gray-50 pt-4">
//           <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Recent Payments</p>
//           <div className="space-y-2">
//             {fee.payments.slice(0, 3).map((p, i) => (
//               <div key={i} className="flex items-center justify-between text-sm">
//                 <div>
//                   <p className="font-semibold text-gray-800">₹{Number(p.amount).toLocaleString("en-IN")}</p>
//                   <p className="text-xs text-gray-400">
//                     {new Date(p.paid_on).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
//                     {p.recorded_by_name && ` · ${p.recorded_by_name}`}
//                   </p>
//                 </div>
//                 <CheckCircle size={16} className="text-emerald-500" />
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Note */}
//       {fee.note && (
//         <div className="px-5 pb-4">
//           <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 italic">
//             📝 {fee.note}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  CreditCard, CheckCircle, Clock, AlertCircle,
  IndianRupee, ChevronRight, Loader2,
} from "lucide-react";

const STATUS_STYLE = {
  Paid:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle,  iconBg: "bg-emerald-100", iconColor: "text-emerald-600", bar: "bg-emerald-400" },
  Partial: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   icon: Clock,        iconBg: "bg-amber-100",   iconColor: "text-amber-600",   bar: "bg-amber-400"   },
  Pending: { bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200",    icon: Clock,        iconBg: "bg-gray-100",    iconColor: "text-gray-400",    bar: "bg-gray-300"    },
  Overdue: { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     icon: AlertCircle,  iconBg: "bg-red-100",     iconColor: "text-red-600",     bar: "bg-red-400"     },
};

const PAYMENT_STATUS = {
  approved:         { label: "Approved",         color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  pending_approval: { label: "Awaiting Approval", color: "text-amber-600 bg-amber-50 border-amber-200"     },
  rejected:         { label: "Rejected",          color: "text-red-600 bg-red-50 border-red-200"           },
};

export default function StudentFeeCard() {
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/fees/student/fees");
      setData(res?.data || res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center h-28">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <CreditCard size={14} className="text-violet-500" />
          </div>
          <h2 className="font-bold text-gray-900 text-sm">Fee Status</h2>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">No fee record found. Contact admin.</p>
      </div>
    );
  }

  const status   = data.status || "Pending";
  const style    = STATUS_STYLE[status] ?? STATUS_STYLE.Pending;
  const Icon     = style.icon;
  const paid     = Number(data.paid_amount || 0);
  const total    = Number(data.total_fees  || 0);
  const pending  = total - paid;
  const percent  = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  // Last 2 payments
  const recentPayments = (data.payments || []).slice(0, 2);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
          <CreditCard size={14} className="text-violet-500" />
        </div>
        <h2 className="font-bold text-gray-900 text-sm">Fee Status</h2>
        <button
          onClick={() => router.push("/students/fees")}
          className="ml-auto flex items-center gap-1 text-xs text-violet-600 font-semibold hover:underline"
        >
          View Details <ChevronRight size={12} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Status banner */}
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${style.bg} ${style.border}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
            <Icon size={18} className={style.iconColor} />
          </div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${style.text}`}>{status}</p>
            {data.due_date && (
              <p className="text-xs text-gray-400 mt-0.5">
                Due: {new Date(data.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 flex items-center gap-0.5 justify-end">
              <IndianRupee size={14} />{total.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">Total Fees</p>
          </div>
        </div>

        {/* Paid / Remaining */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-xl px-3 py-2.5 text-center border border-emerald-100">
            <p className="text-base font-bold text-emerald-600 flex items-center justify-center gap-0.5">
              <IndianRupee size={12} />{paid.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Paid</p>
          </div>
          <div className={`rounded-xl px-3 py-2.5 text-center border ${pending > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
            <p className={`text-base font-bold flex items-center justify-center gap-0.5 ${pending > 0 ? "text-red-500" : "text-emerald-500"}`}>
              <IndianRupee size={12} />{pending.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Remaining</p>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">Collection Progress</span>
              <span className="text-[10px] font-bold text-gray-600">{percent.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {/* Recent payments */}
        {recentPayments.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Recent Payments</p>
            <div className="space-y-2">
              {recentPayments.map((p, i) => {
                const ps     = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.approved;
                const isCash = !p.razorpay_payment_id;
                return (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Mode badge */}
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCash
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-violet-50 text-violet-700 border-violet-200"
                      }`}>
                        {isCash ? "Cash" : "Online"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800">
                          ₹{Number(p.amount).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(p.paid_on || p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ps.color}`}>
                      {ps.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        {pending > 0 && status !== "Paid" && (
          <button
            onClick={() => router.push("/students/fees")}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CreditCard size={14} />
            Pay ₹{pending.toLocaleString("en-IN")} Now
          </button>
        )}
      </div>
    </div>
  );
}