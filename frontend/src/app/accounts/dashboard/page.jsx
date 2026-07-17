"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  Clock,
  IndianRupee,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";

const money = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

export default function AccountsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setData(await apiFetch("/accounts/dashboard"));
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const summary = data?.summary || {};
  const cards = [
    [
      "Today's Collection",
      summary.today_collection,
      IndianRupee,
      "text-emerald-600",
    ],
    [
      "Monthly Collection",
      summary.month_collection,
      TrendingUp,
      "text-blue-600",
    ],
    ["Pending Fees", summary.pending_fees, Clock, "text-amber-600"],
    [
      "Pending Approvals",
      summary.pending_approvals,
      Wallet,
      "text-violet-600",
      false,
    ],
    ["Other Income", summary.other_income, Banknote, "text-cyan-600"],
    ["Monthly Expenses", summary.expenses, TrendingDown, "text-red-600"],
    [
      "Outstanding Payroll",
      summary.outstanding_payroll,
      Banknote,
      "text-orange-600",
    ],
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Financial overview for {data?.academic_year || "current year"}
        </p>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
        )}
        {!data && !error ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(([label, value, Icon, color, currency = true]) => (
                <div
                  key={label}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <Icon className={color} size={20} />
                  <p className="mt-3 text-2xl font-bold text-gray-900">
                    {currency ? money(value) : Number(value || 0)}
                  </p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <Recent
                title="Recent Fee Payments"
                rows={data?.recent_payments || []}
                payment
              />
              <Recent
                title="Recent Income & Expenses"
                rows={data?.recent_transactions || []}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Recent({ title, rows, payment = false }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <h2 className="border-b px-5 py-4 font-bold text-gray-900">{title}</h2>
      <div className="divide-y">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between px-5 py-3 text-sm"
          >
            <div>
              <p className="font-semibold">
                {payment ? row.student_name : row.category}
              </p>
              <p className="text-xs text-gray-400">
                {payment ? row.payment_mode : row.transaction_type} ·{" "}
                {(row.paid_on || row.transaction_date)?.slice(0, 10)}
              </p>
            </div>
            <p className="font-bold">{money(row.amount)}</p>
          </div>
        ))}
        {!rows.length && (
          <p className="p-8 text-center text-sm text-gray-400">
            No recent records.
          </p>
        )}
      </div>
    </section>
  );
}
