"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";

const DOCUMENT_TYPES = [
  "Transfer Certificate",
  "Birth Certificate",
  "Bonafide Certificate",
  "Character Certificate",
  "Migration Certificate",
  "Marksheet / Report Card",
  "Identity Proof",
  "Address Proof",
  "Caste Certificate",
  "Income Certificate",
  "Domicile Certificate",
  "Medical Record",
  "Vaccination Record",
  "Consent Form",
  "Certificate",
  "Other",
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    student_id: "",
    document_type: "Certificate",
    title: "",
    document_number: "",
    issue_date: "",
    expiry_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [documentData, studentData] = await Promise.all([
        apiFetch("/documents"),
        apiFetch("/admin/students"),
      ]);
      setDocuments(Array.isArray(documentData) ? documentData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      documents.filter((item) =>
        [
          item.student_name,
          item.roll_number,
          item.title,
          item.document_type,
          item.document_number,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [documents, search],
  );

  const upload = async () => {
    if (!file || !form.student_id || !form.title.trim()) {
      setError("Student, title, and file are required.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) body.append(key, value);
      });
      body.append("file", file);
      await apiFetch("/documents", { method: "POST", body });
      setMessage("Document uploaded successfully.");
      setFile(null);
      setForm((current) => ({
        ...current,
        title: "",
        document_number: "",
        issue_date: "",
        expiry_date: "",
      }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const verify = async (item) => {
    await apiFetch(`/documents/${item.id}/verify`, {
      method: "PUT",
      body: JSON.stringify({ verified: !item.verified }),
    });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this document permanently?")) return;
    await apiFetch(`/documents/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">
              Student Documents
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload and verify certificates, identity records, and forms.
            </p>
          </div>
        </header>
        <div className="space-y-5 p-5 lg:p-8">
          <section className="rounded-lg border border-orange-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Upload Document</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={form.student_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    student_id: event.target.value,
                  }))
                }
                className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} | {student.roll_number} | {student.class}-
                    {student.section}
                  </option>
                ))}
              </select>
              <select
                value={form.document_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    document_type: event.target.value,
                  }))
                }
                className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Document title"
                className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              />
              <input
                value={form.document_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    document_number: event.target.value,
                  }))
                }
                placeholder="Document number"
                className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              />
              <label className="text-xs font-semibold text-gray-500">
                Issue Date
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      issue_date: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Expiry Date
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiry_date: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-sm"
                />
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="self-end text-sm"
              />
              <p className="self-end text-xs text-gray-400">
                PDF, image, Word, Excel, CSV or TXT; maximum 20MB.
              </p>
              <button
                onClick={upload}
                disabled={uploading}
                className="flex items-center justify-center gap-2 self-end rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                Upload
              </button>
            </div>
          </section>

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

          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full py-2.5 text-sm outline-none"
              placeholder="Search documents or students"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-orange-50 text-xs text-gray-600">
                <tr>
                  {[
                    "Student",
                    "Document",
                    "Number",
                    "Dates",
                    "Verification",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.student_name}</p>
                      <p className="text-xs text-gray-500">
                        {item.roll_number} | {item.class}-{item.section}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={getMediaUrl(item.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 font-semibold text-orange-700"
                      >
                        <FileText size={15} /> {item.title}
                      </a>
                      <p className="text-xs text-gray-500">
                        {item.document_type}
                      </p>
                    </td>
                    <td className="px-4 py-3">{item.document_number || "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <p>Issue: {item.issue_date?.slice(0, 10) || "-"}</p>
                      <p>Expiry: {item.expiry_date?.slice(0, 10) || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.verified
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => verify(item)}
                          className="p-2 text-green-600"
                          title={
                            item.verified ? "Remove verification" : "Verify"
                          }
                        >
                          <ShieldCheck size={16} />
                        </button>
                        <button
                          onClick={() => remove(item.id)}
                          className="p-2 text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !filtered.length && (
              <p className="py-16 text-center text-sm text-gray-500">
                No documents found.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
