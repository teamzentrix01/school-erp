"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

const today = new Date().toISOString().slice(0, 10);
const defaultFrom = `${new Date().getFullYear()}-01-01`;
const emptyTransaction = {
  transaction_date: today,
  transaction_type: "Expense",
  category: "",
  amount: "",
  payment_mode: "Bank Transfer",
  reference_number: "",
  party_name: "",
  description: "",
};

const currency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export default function FinancePage() {
  const isAdmin = useCurrentUser()?.role === "admin";
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [range, setRange] = useState({ from: defaultFrom, to: today });
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams(range);
    try {
      const [summary, rows] = await Promise.all([
        apiFetch(`/admin/finance/dashboard?${query}`),
        apiFetch(`/admin/finance/transactions?${query}`),
      ]);
      setDashboard(summary);
      setTransactions(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (form) => {
    await apiFetch(
      `/admin/finance/transactions${modal?.id ? `/${modal.id}` : ""}`,
      {
        method: modal?.id ? "PUT" : "POST",
        body: JSON.stringify(form),
      },
    );
    setModal(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this finance transaction?")) return;
    await apiFetch(`/admin/finance/transactions/${id}`, { method: "DELETE" });
    load();
  };

  const expenseCategories = useMemo(
    () =>
      (dashboard?.categories || []).filter(
        (item) => item.transaction_type === "Expense",
      ),
    [dashboard],
  );

  const summary = dashboard?.summary || {};
  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                College Finance
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Fees, income, expenses, payroll, and net position.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-lg border border-orange-200 p-2.5 text-orange-700"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>
        <div className="space-y-5 p-5 lg:p-8">
          <div className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-white p-4 sm:flex-row sm:items-end">
            {["from", "to"].map((key) => (
              <label key={key} className="text-xs font-semibold text-gray-500">
                {key === "from" ? "From" : "To"}
                <input
                  type="date"
                  value={range[key]}
                  onChange={(event) =>
                    setRange((value) => ({
                      ...value,
                      [key]: event.target.value,
                    }))
                  }
                  className="mt-1 block rounded-lg border border-orange-200 px-3 py-2 text-sm"
                />
              </label>
            ))}
            <button
              onClick={() => setModal({})}
              className="sm:ml-auto flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={15} /> Record Transaction
            </button>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [
                "Total Income",
                summary.total_income,
                ArrowUpCircle,
                "text-green-600",
              ],
              [
                "Total Expense",
                summary.total_expense,
                ArrowDownCircle,
                "text-red-600",
              ],
              [
                "Salary Paid",
                summary.salary_expenses,
                Banknote,
                "text-orange-600",
              ],
              ["Net Position", summary.net, Wallet, "text-blue-600"],
            ].map(([label, value, Icon, color]) => (
              <div
                key={label}
                className="rounded-lg border border-orange-200 bg-white p-4"
              >
                <Icon size={18} className={color} />
                <p className="mt-3 text-xl font-bold text-gray-900">
                  {currency(value)}
                </p>
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                <div className="min-w-0 rounded-lg border border-orange-200 bg-white p-4">
                  <h2 className="font-bold text-gray-900">
                    Monthly Income vs Expense
                  </h2>
                  <div className="mt-4 h-72 min-h-72 min-w-0">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={288}
                      initialDimension={{ width: 640, height: 288 }}
                    >
                      <BarChart data={dashboard?.trend || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(value) => currency(value)} />
                        <Legend />
                        <Bar dataKey="income" fill="#16a34a" />
                        <Bar dataKey="expense" fill="#ea580c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-lg border border-orange-200 bg-white p-4">
                  <h2 className="font-bold text-gray-900">
                    Expense Categories
                  </h2>
                  <div className="mt-4 space-y-3">
                    {expenseCategories.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between border-b border-orange-100 pb-2 text-sm"
                      >
                        <span>{item.category}</span>
                        <strong>{currency(item.amount)}</strong>
                      </div>
                    ))}
                    {!expenseCategories.length && (
                      <p className="py-10 text-center text-sm text-gray-500">
                        No expenses in this period.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      {[
                        "Date",
                        "Type",
                        "Category",
                        "Party",
                        "Mode / Reference",
                        "Amount",
                        "Actions",
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {transactions.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          {item.transaction_date?.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              item.transaction_type === "Income"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{item.category}</td>
                        <td className="px-4 py-3">{item.party_name || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          <p>{item.payment_mode || "-"}</p>
                          <p>{item.reference_number || ""}</p>
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {currency(item.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setModal(item)}
                            className="p-2 text-gray-500"
                          >
                            <Pencil size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => remove(item.id)}
                              className="p-2 text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!transactions.length && (
                  <p className="py-16 text-center text-sm text-gray-500">
                    No manual transactions in this period.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      {modal && (
        <TransactionModal
          initial={modal.id ? modal : emptyTransaction}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function TransactionModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptyTransaction, ...initial });
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold">
            {initial.id ? "Edit Transaction" : "Record Transaction"}
          </h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="text-xs font-semibold text-gray-500">
            Type
            <select
              value={form.transaction_type}
              onChange={(event) => set("transaction_type", event.target.value)}
              className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
            >
              <option>Income</option>
              <option>Expense</option>
            </select>
          </label>
          {[
            ["transaction_date", "Date", "date"],
            ["category", "Category", "text"],
            ["amount", "Amount", "number"],
            ["party_name", "Party / Vendor", "text"],
            ["payment_mode", "Payment Mode", "text"],
            ["reference_number", "Reference Number", "text"],
          ].map(([key, label, type]) => (
            <label key={key} className="text-xs font-semibold text-gray-500">
              {label}
              <input
                type={type}
                min={type === "number" ? 0 : undefined}
                value={form[key] ?? ""}
                onChange={(event) => set(key, event.target.value)}
                className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              />
            </label>
          ))}
          <label className="sm:col-span-2 text-xs font-semibold text-gray-500">
            Description
            <textarea
              value={form.description || ""}
              onChange={(event) => set("description", event.target.value)}
              className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
