"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, UserCheck, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";

const empty = {
  name: "",
  email: "",
  password: "",
  employee_code: "",
  phone: "",
  is_active: true,
};

export default function AccountsUsersPage() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch("/accounts/users"));
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (form) => {
    await apiFetch(`/accounts/users${modal?.id ? `/${modal.id}` : ""}`, {
      method: modal?.id ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    setModal(null);
    load();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Accounts Users</h1>
            <p className="text-sm text-gray-500">
              Create and control finance-only login accounts.
            </p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={15} /> Add Accounts User
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
        )}
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Employee", "Email", "Phone", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-gray-400">
                      {user.employee_code}
                    </p>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        user.is_active ? "text-emerald-600" : "text-red-500"
                      }
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal(user)}
                      className="p-2 text-blue-600"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && (
            <p className="p-12 text-center text-gray-400">
              No Accounts users created.
            </p>
          )}
        </div>
      </main>
      {modal && (
        <UserModal
          initial={modal.id ? modal : empty}
          editing={Boolean(modal.id)}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function UserModal({ initial, editing, onClose, onSave }) {
  const [form, setForm] = useState({ ...empty, ...initial, password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-bold">
            {editing ? "Edit Accounts User" : "Create Accounts User"}
          </h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["name", "Full name"],
            ["email", "Email"],
            ["employee_code", "Employee code"],
            ["phone", "Phone"],
          ].map(([key, label]) => (
            <label key={key} className="text-xs font-semibold text-gray-500">
              {label}
              <input
                value={form[key] || ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </label>
          ))}
          <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
            {editing ? "New password (optional)" : "Temporary password"}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </label>
          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />{" "}
              Active login
            </label>
          )}
          {error && (
            <p className="sm:col-span-2 text-sm text-red-600">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <UserCheck size={15} />
            )}{" "}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
