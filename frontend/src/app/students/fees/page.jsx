"use client";

import { useState, useEffect, useCallback } from "react";
import Script from "next/script";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Upload,
  IndianRupee,
  Shield,
  XCircle,
  Loader2,
  ImageIcon,
  Banknote,
  Smartphone,
} from "lucide-react";

const STATUS_STYLE = {
  Paid: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle,
    iconColor: "text-emerald-600",
  },
  Partial: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: Clock,
    iconColor: "text-amber-600",
  },
  Pending: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    icon: Clock,
    iconColor: "text-gray-400",
  },
  Overdue: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-600",
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

function FeeRow({ label, amount }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">
        ₹{Number(amount || 0).toLocaleString("en-IN")}
      </span>
    </div>
  );
}

function PaymentModeBadge({ payment }) {
  const isCash = !payment.razorpay_payment_id;
  if (isCash) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
        <Banknote size={8} /> Cash
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
      <Smartphone size={8} /> Online
    </span>
  );
}

// ── Razorpay Payment Modal ────────────────────────────────────────────────────
function PaymentModal({ feeData, onClose, onSuccess }) {
  const [step, setStep] = useState("amount");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paidMeta, setPaidMeta] = useState(null);

  const remaining =
    Number(feeData?.total_fees || 0) - Number(feeData?.paid_amount || 0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReceipt(file);
    setPreview(
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    );
  };

  const openRazorpay = async () => {
    if (!amount || Number(amount) <= 0) return setError("Enter a valid amount");
    if (Number(amount) > remaining)
      return setError(`Max payable: ₹${remaining.toLocaleString("en-IN")}`);
    setLoading(true);
    setError("");

    try {
      const orderData = await apiFetch("/fees/payment/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount) }),
      });

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: "School Fees",
        description: "Fee Payment",
        prefill: {
          name: orderData.student_name,
          email: orderData.student_email,
        },
        theme: { color: "#ff9933" },
        handler: async (response) => {
          try {
            await apiFetch("/fees/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            setPaidMeta({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              amount: Number(amount),
            });
            setStep("uploading");
          } catch {
            setError("Payment verification failed. Contact admin.");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () =>
        setError("Payment failed. Please try again."),
      );
      rzp.open();
    } catch (err) {
      setError(err.message || "Could not initiate payment");
      setLoading(false);
    }
  };

  const uploadReceiptHandler = async () => {
    if (!receipt) return setError("Please select a receipt file");
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("receipt", receipt);
      form.append("razorpay_order_id", paidMeta.order_id);
      form.append("razorpay_payment_id", paidMeta.payment_id);
      form.append("amount", paidMeta.amount);
      if (note) form.append("note", note);

      await apiFetch("/fees/payment/upload-receipt", {
        method: "POST",
        body: form,
      });
      setStep("done");
      onSuccess?.();
    } catch {
      setError("Failed to upload receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-violet-600 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard size={18} className="text-white" />
            <h2 className="text-white font-bold text-sm">Pay Fees</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {step === "amount" && (
            <>
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-xs text-gray-400 mb-0.5">
                  Remaining Balance
                </p>
                <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
                  <IndianRupee size={16} />
                  {remaining.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Amount to Pay <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <IndianRupee
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min="1"
                    max={remaining}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Max ₹${remaining.toLocaleString("en-IN")}`}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <button
                  className="mt-1 text-xs text-violet-600 font-semibold hover:underline"
                  onClick={() => setAmount(String(remaining))}
                >
                  Pay full amount
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <Shield size={11} className="text-blue-400 flex-shrink-0" />
                Secured by Razorpay. UPI, Cards, Net Banking accepted.
              </div>
              <button
                onClick={openRazorpay}
                disabled={loading || !amount}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CreditCard size={15} />
                )}
                {loading ? "Opening Razorpay..." : "Pay Now"}
              </button>
            </>
          )}

          {step === "uploading" && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                <CheckCircle
                  size={16}
                  className="text-emerald-600 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-emerald-700">
                    Payment Successful!
                  </p>
                  <p className="text-xs text-emerald-600">
                    ₹{Number(paidMeta?.amount).toLocaleString("en-IN")} · ID:{" "}
                    {paidMeta?.payment_id}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Upload your Razorpay payment receipt for admin verification.
              </p>
              <label className="block cursor-pointer">
                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${receipt ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-violet-200"}`}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="mx-auto max-h-36 rounded-lg object-contain"
                    />
                  ) : receipt ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <ImageIcon size={28} className="text-violet-400" />
                      <p className="text-sm text-violet-600 font-semibold">
                        {receipt.name}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={24} className="text-gray-300" />
                      <p className="text-sm text-gray-500 font-semibold">
                        Click to upload receipt
                      </p>
                      <p className="text-xs text-gray-400">
                        JPG, PNG, PDF up to 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Q2 fees payment"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}
              <button
                onClick={uploadReceiptHandler}
                disabled={loading || !receipt}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                {loading ? "Uploading..." : "Submit Receipt for Approval"}
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Receipt Submitted!</p>
                <p className="text-xs text-gray-500 mt-1">
                  Admin will verify and approve your payment. Your fee status
                  will update automatically.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Payment History Card (side-by-side grid item) ─────────────────────────────
function PaymentCard({ p }) {
  const ps = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.approved;
  const isCash = !p.razorpay_payment_id;

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex gap-3 items-start">
      {/* Receipt / Cash icon */}
      <div className="flex-shrink-0">
        {p.receipt_url ? (
          <a
            href={getMediaUrl(p.receipt_url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-white flex items-center justify-center hover:opacity-75 transition-opacity">
              {p.receipt_url.endsWith(".pdf") ? (
                <ImageIcon size={16} className="text-gray-400" />
              ) : (
                <img
                  src={getMediaUrl(p.receipt_url)}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </a>
        ) : isCash ? (
          <div className="w-10 h-10 rounded-lg border border-amber-100 bg-amber-50 flex items-center justify-center">
            <Banknote size={16} className="text-amber-400" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-100 flex items-center justify-center">
            <CreditCard size={16} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-sm font-bold text-gray-900">
            ₹{Number(p.amount).toLocaleString("en-IN")}
          </span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ps.color}`}
          >
            {ps.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <PaymentModeBadge payment={p} />
          <span className="text-[10px] text-gray-400">
            {new Date(p.paid_on || p.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {p.razorpay_payment_id && (
          <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
            {p.razorpay_payment_id}
          </p>
        )}
        {p.note && (
          <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">
            {p.note}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentFeesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/fees/student/fees");
      setData(res?.data || res);
    } catch {
      setError("Failed to load fee details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const status = data?.status || "Pending";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.Pending;
  const Icon = style.icon;
  const pending =
    Number(data?.total_fees || 0) - Number(data?.paid_amount || 0);
  const canPay = pending > 0 && status !== "Paid";

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      {showPayment && (
        <PaymentModal
          feeData={data}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            load();
          }}
        />
      )}

      <div className="portal-saffron flex min-h-screen bg-gray-50">
        <StudentSidebar />

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 shadow-sm">
            <div className="pl-10 lg:pl-0 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-bold text-gray-900">My Fees</h1>
                <p className="text-xs text-gray-400">
                  Academic Year {data?.academic_year || "2024-25"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canPay && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <CreditCard size={12} />
                    Pay Now
                  </button>
                )}
                <button
                  onClick={load}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw
                    size={12}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 max-w-2xl">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl flex items-center justify-between">
                {error}
                <button
                  onClick={load}
                  className="text-red-700 font-semibold hover:underline text-xs ml-3"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && (
              <div className="space-y-2.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && data && (
              <>
                {/* Status Banner */}
                <div
                  className={`rounded-xl border p-4 flex items-center gap-3 ${style.bg} ${style.border}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className={style.iconColor} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${style.text}`}>
                      {status}
                    </p>
                    <p className="text-xs text-gray-400">
                      {data.due_date
                        ? `Due: ${new Date(data.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                        : "No due date set"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      ₹{Number(data.total_fees || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400">Total Fees</p>
                  </div>
                </div>

                {/* Summary + Fee Breakdown side by side */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">
                        ₹{Number(data.paid_amount || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-gray-400">Amount Paid</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                      <p
                        className={`text-lg font-bold ${pending > 0 ? "text-red-500" : "text-emerald-500"}`}
                      >
                        ₹{pending.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-gray-400">Remaining</p>
                    </div>
                  </div>

                  {/* Fee Breakdown */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="px-3 py-2.5 border-b border-gray-50">
                      <h2 className="font-bold text-gray-900 text-xs">
                        Fee Breakdown
                      </h2>
                    </div>
                    <div className="px-3 py-1">
                      <FeeRow label="Tuition" amount={data.tuition_fee} />
                      <FeeRow label="Library" amount={data.library_fee} />
                      <FeeRow label="Transport" amount={data.transport_fee} />
                      <FeeRow label="Other" amount={data.other_fee} />
                      <div className="flex items-center justify-between py-2 mt-0.5 border-t-2 border-gray-200">
                        <span className="text-xs font-bold text-gray-900">
                          Total
                        </span>
                        <span className="text-xs font-bold text-violet-700">
                          ₹
                          {Number(data.total_fees || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {canPay && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
                  >
                    <CreditCard size={15} />
                    Pay ₹{pending.toLocaleString("en-IN")} Now
                  </button>
                )}

                {/* Payment History — 2-column grid */}
                {data.payments?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                      <h2 className="font-bold text-gray-900 text-xs">
                        Payment History
                      </h2>
                      <span className="text-xs text-gray-400">
                        {data.payments.length} transaction
                        {data.payments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.payments.map((p, i) => (
                        <PaymentCard key={i} p={p} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Note from admin */}
                {data.note && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-amber-700 mb-0.5">
                      Note from Admin
                    </p>
                    <p className="text-xs text-amber-800">{data.note}</p>
                  </div>
                )}
              </>
            )}

            {!loading && !data && !error && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
                <CreditCard size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm font-semibold text-gray-500">
                  No fee record found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Contact admin for details
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
