"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

const current = new Date();
const emptyStaff = {
  employee_code: "",
  name: "",
  role_title: "",
  department: "",
  phone: "",
  email: "",
  joining_date: "",
  base_salary: 0,
  bank_account: "",
  bank_ifsc: "",
  status: "Active",
};

export default function PayrollPage() {
  const isAdmin = useCurrentUser()?.role === "admin";
  const [tab, setTab] = useState("payroll");
  const [employees, setEmployees] = useState({ staff: [], teachers: [] });
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runData, setRunData] = useState(null);
  const [staffModal, setStaffModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [period, setPeriod] = useState({
    month: current.getMonth() + 1,
    year: current.getFullYear(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, payrollRuns] = await Promise.all([
        apiFetch("/admin/payroll/staff"),
        apiFetch("/admin/payroll/runs"),
      ]);
      setEmployees(staff);
      setRuns(payrollRuns);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadRun = async (id) => {
    setSelectedRun(id);
    setRunData(await apiFetch(`/admin/payroll/runs/${id}`));
  };

  const generate = async () => {
    try {
      const run = await apiFetch("/admin/payroll/runs", {
        method: "POST",
        body: JSON.stringify(period),
      });
      setMessage("Payroll generated successfully.");
      await load();
      await loadRun(run.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveStaff = async (form) => {
    await apiFetch(
      `/admin/payroll/staff${staffModal?.id ? `/${staffModal.id}` : ""}`,
      {
        method: staffModal?.id ? "PUT" : "POST",
        body: JSON.stringify(form),
      },
    );
    setStaffModal(null);
    setMessage("Staff member saved.");
    load();
  };

  const removeStaff = async (id) => {
    if (!window.confirm("Delete this staff member?")) return;
    await apiFetch(`/admin/payroll/staff/${id}`, { method: "DELETE" });
    load();
  };

  const updateEntry = async (entry) => {
    try {
      await apiFetch(`/admin/payroll/entries/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({
          allowances: entry.allowances,
          deductions: entry.deductions,
          remarks: entry.remarks,
        }),
      });
      setMessage("Salary calculation updated.");
      loadRun(selectedRun);
    } catch (err) {
      setError(err.message);
    }
  };

  const payEntry = async (entry) => {
    const reference = window.prompt("Transaction reference (optional)") || "";
    await apiFetch(`/admin/payroll/entries/${entry.id}/pay`, {
      method: "POST",
      body: JSON.stringify({
        allowances: entry.allowances,
        deductions: entry.deductions,
        remarks: entry.remarks,
        payment_mode: "Bank Transfer",
        transaction_reference: reference,
      }),
    });
    setMessage(`${entry.employee_name}'s salary marked paid.`);
    loadRun(selectedRun);
    load();
  };

  const totalMonthly = useMemo(
    () =>
      runs.find((run) => Number(run.id) === Number(selectedRun))
        ?.total_payroll || 0,
    [runs, selectedRun],
  );

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Salary & Payroll
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Teachers, workers, salary calculations, and payments.
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Teachers", employees.teachers.length, Users],
              ["Workers", employees.staff.length, Users],
              ["Payroll Runs", runs.length, Banknote],
              [
                "Selected Payroll",
                `Rs ${Number(totalMonthly).toLocaleString("en-IN")}`,
                Banknote,
              ],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-orange-200 bg-white p-4"
              >
                <Icon size={17} className="text-orange-600" />
                <p className="mt-3 text-xl font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={15} /> {message}
            </p>
          )}
          <div className="flex border-b border-orange-200">
            {[
              ["payroll", "Monthly Payroll"],
              ["staff", "Workers"],
              ["teachers", "Teachers"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                  tab === key
                    ? "border-orange-600 text-orange-700"
                    : "border-transparent text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : tab === "payroll" ? (
            <>
              <section className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-white p-4 sm:flex-row sm:items-end">
                <label className="text-xs font-semibold text-gray-500">
                  Month
                  <select
                    value={period.month}
                    onChange={(event) =>
                      setPeriod((value) => ({
                        ...value,
                        month: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {new Date(2000, index).toLocaleString("en-IN", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-gray-500">
                  Year
                  <input
                    type="number"
                    value={period.year}
                    onChange={(event) =>
                      setPeriod((value) => ({
                        ...value,
                        year: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block w-28 rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  onClick={generate}
                  className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={15} /> Generate / Open Payroll
                </button>
                <select
                  value={selectedRun || ""}
                  onChange={(event) => loadRun(event.target.value)}
                  className="sm:ml-auto rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select payroll run</option>
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {new Date(2000, Number(run.month) - 1).toLocaleString(
                        "en-IN",
                        { month: "long" },
                      )}{" "}
                      {run.year} | {run.status}
                    </option>
                  ))}
                </select>
              </section>
              <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead className="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      {[
                        "Employee",
                        "Type",
                        "Base",
                        "Allowances",
                        "Deductions",
                        "Net Salary",
                        "Payment",
                        "Actions",
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {(runData?.entries || []).map((entry) => (
                      <PayrollRow
                        key={entry.id}
                        entry={entry}
                        onSave={updateEntry}
                        onPay={payEntry}
                      />
                    ))}
                  </tbody>
                </table>
                {!runData && (
                  <p className="py-16 text-center text-sm text-gray-500">
                    Generate or select a payroll run.
                  </p>
                )}
              </div>
            </>
          ) : tab === "staff" ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setStaffModal({})}
                  className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={15} /> Add Worker
                </button>
              </div>
              <EmployeeTable
                rows={employees.staff}
                type="staff"
                onEdit={setStaffModal}
                onDelete={removeStaff}
                canDelete={isAdmin}
              />
            </>
          ) : (
            <EmployeeTable rows={employees.teachers} type="teacher" />
          )}
        </div>
      </main>
      {staffModal && (
        <StaffModal
          initial={staffModal.id ? staffModal : emptyStaff}
          onClose={() => setStaffModal(null)}
          onSave={saveStaff}
        />
      )}
    </div>
  );
}

function PayrollRow({ entry, onSave, onPay }) {
  const [draft, setDraft] = useState(entry);
  const paid = entry.payment_status === "Paid";
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-semibold">{entry.employee_name}</p>
        <p className="text-xs text-gray-500">{entry.employee_code}</p>
      </td>
      <td className="px-4 py-3">{entry.employee_type}</td>
      <td className="px-4 py-3">
        Rs {Number(entry.base_salary).toLocaleString()}
      </td>
      {["allowances", "deductions"].map((key) => (
        <td key={key} className="px-4 py-3">
          <input
            type="number"
            min="0"
            disabled={paid}
            value={draft[key]}
            onChange={(event) =>
              setDraft((value) => ({ ...value, [key]: event.target.value }))
            }
            className="w-28 rounded-lg border border-orange-200 px-2 py-1.5 disabled:bg-gray-50"
          />
        </td>
      ))}
      <td className="px-4 py-3 font-bold">
        Rs{" "}
        {Math.max(
          Number(entry.base_salary) +
            Number(draft.allowances || 0) -
            Number(draft.deductions || 0),
          0,
        ).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            paid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {entry.payment_status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {!paid && (
            <>
              <button
                onClick={() => onSave(draft)}
                className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold"
              >
                Save
              </button>
              <button
                onClick={() =>
                  onPay({
                    ...entry,
                    allowances: draft.allowances,
                    deductions: draft.deductions,
                    remarks: draft.remarks,
                    net_salary:
                      Number(entry.base_salary) +
                      Number(draft.allowances || 0) -
                      Number(draft.deductions || 0),
                  })
                }
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Pay
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function EmployeeTable({ rows, type, onEdit, onDelete, canDelete = false }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-orange-50 text-xs text-gray-600">
          <tr>
            {[
              "Employee",
              "Role",
              "Department",
              "Base Salary",
              "Status",
              "Actions",
            ].map((heading) => (
              <th key={heading} className="px-4 py-3 text-left">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100">
          {rows.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.employee_code || item.employee_id}
                </p>
              </td>
              <td className="px-4 py-3">
                {item.role_title || item.teacher_type || "Teacher"}
              </td>
              <td className="px-4 py-3">{item.department || "-"}</td>
              <td className="px-4 py-3">
                Rs{" "}
                {Number(item.base_salary ?? item.salary ?? 0).toLocaleString()}
              </td>
              <td className="px-4 py-3">{item.status}</td>
              <td className="px-4 py-3">
                {type === "staff" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 text-gray-500"
                    >
                      <Pencil size={14} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="py-16 text-center text-sm text-gray-500">
          No employees found.
        </p>
      )}
    </div>
  );
}

function StaffModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptyStaff, ...initial });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold">
            {initial.id ? "Edit Worker" : "Add Worker"}
          </h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["employee_code", "Employee Code"],
            ["name", "Name"],
            ["role_title", "Role"],
            ["department", "Department"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["joining_date", "Joining Date", "date"],
            ["base_salary", "Base Salary", "number"],
            ["bank_account", "Bank Account"],
            ["bank_ifsc", "IFSC"],
          ].map(([key, label, type = "text"]) => (
            <label key={key} className="text-xs font-semibold text-gray-500">
              {label}
              <input
                type={type}
                value={form[key] ?? ""}
                onChange={(event) =>
                  setForm((value) => ({ ...value, [key]: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              />
            </label>
          ))}
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
            Save Worker
          </button>
        </div>
      </div>
    </div>
  );
}
