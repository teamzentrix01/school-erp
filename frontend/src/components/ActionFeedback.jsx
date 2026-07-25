"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export function ToastMessage({ toast, onClose }) {
  if (!toast?.message) return null;
  const styles = {
    success: ["border-green-200 bg-green-50 text-green-800", CheckCircle2],
    error: ["border-red-200 bg-red-50 text-red-800", XCircle],
    info: ["border-blue-200 bg-blue-50 text-blue-800", Info],
  };
  const [className, Icon] = styles[toast.type] || styles.info;
  return (
    <div
      role="status"
      className={`fixed right-5 top-5 z-[80] flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-xl ${className}`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} aria-label="Close notification">
        <X size={17} />
      </button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  tone = "warning",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  const danger = tone === "danger";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${
            danger
              ? "bg-red-50 text-red-600"
              : "bg-orange-50 text-orange-600"
          }`}
        >
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-red-600" : "bg-orange-600"
            }`}
          >
            {busy ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
