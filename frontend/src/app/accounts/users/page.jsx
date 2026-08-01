"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, FileText, Loader2, Pencil, Plus, Trash2, Upload, UserCheck, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";

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

  const save = async (form, documentFile, documentType) => {
    const saved = await apiFetch(`/accounts/users${modal?.id ? `/${modal.id}` : ""}`, {
      method: modal?.id ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    const userId = modal?.id || saved?.id;
    if (documentFile && userId) {
      const body = new FormData();
      body.append("document", documentFile);
      body.append("document_type", documentType || "Identity Document");
      await apiFetch(`/accounts/users/${userId}/documents`, {
        method: "POST",
        body,
      });
    }
    setModal(null);
    load();
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Delete accounts user ${user.name}?`)) return;
    try {
      await apiFetch(`/accounts/users/${user.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeDocument = async (userId, documentId) => {
    await apiFetch(`/accounts/users/${userId}/documents/${documentId}`, {
      method: "DELETE",
    });
    const refreshed = await apiFetch("/accounts/users");
    setUsers(refreshed);
    setModal(refreshed.find((user) => Number(user.id) === Number(userId)) || null);
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
                {["Employee", "Email", "Phone", "Documents", "Status", "Action"].map((h) => (
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
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <FileText size={14} /> {user.documents?.length || 0}
                    </span>
                  </td>
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
                    <button
                      onClick={() => removeUser(user)}
                      className="p-2 text-red-500"
                      title="Delete accounts user"
                    >
                      <Trash2 size={15} />
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
          onDeleteDocument={removeDocument}
        />
      )}
    </div>
  );
}

function UserModal({ initial, editing, onClose, onSave, onDeleteDocument }) {
  const [form, setForm] = useState({ ...empty, ...initial, password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState("Identity Document");
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(form, documentFile, documentType);
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
          <div className="sm:col-span-2 rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800">ID / Documents</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="Document type"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-gray-500">
                <Upload size={14} /> {documentFile?.name || "Choose PDF or image"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {!!initial.documents?.length && (
              <div className="mt-3 space-y-2">
                {initial.documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <span>{document.document_type}: {document.original_name}</span>
                    <span className="flex gap-1">
                      <a href={getMediaUrl(document.file_url)} target="_blank" rel="noreferrer" className="p-1 text-blue-600"><Eye size={13} /></a>
                      <button onClick={() => onDeleteDocument(initial.id, document.id)} className="p-1 text-red-500"><Trash2 size={13} /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
