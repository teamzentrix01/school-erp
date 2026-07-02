"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";

const emptyBook = {
  accession_number: "",
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  publication_year: "",
  rack: "",
  total_copies: 1,
  status: "Active",
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-orange-100 bg-white px-5 py-4">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [data, setData] = useState({ books: [], issues: [], students: [] });
  const [tab, setTab] = useState("books");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bookModal, setBookModal] = useState(null);
  const [issueBook, setIssueBook] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch("/library"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const books = useMemo(
    () =>
      data.books.filter((book) =>
        [book.title, book.author, book.accession_number, book.isbn]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data.books, search],
  );
  const issues = useMemo(
    () =>
      data.issues.filter((issue) =>
        [issue.book_title, issue.student_name, issue.roll_number]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data.issues, search],
  );
  const activeIssues = data.issues.filter((item) => !item.return_date);
  const overdue = activeIssues.filter(
    (item) => item.current_status === "Overdue",
  );

  const saveBook = async (form) => {
    try {
      await apiFetch(
        `/library/books${bookModal?.id ? `/${bookModal.id}` : ""}`,
        {
          method: bookModal?.id ? "PUT" : "POST",
          body: JSON.stringify(form),
        },
      );
      setBookModal(null);
      setMessage("Book saved successfully.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    try {
      await apiFetch(`/library/books/${id}`, { method: "DELETE" });
      setMessage("Book deleted.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const issue = async (form) => {
    try {
      await apiFetch("/library/issues", {
        method: "POST",
        body: JSON.stringify({ ...form, book_id: issueBook.id }),
      });
      setIssueBook(null);
      setMessage("Book issued successfully.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const returnBook = async (item) => {
    const fine = Number(item.calculated_fine || 0);
    const finePaid =
      fine === 0 ||
      window.confirm(
        `Fine is Rs ${fine}. Confirm that the fine has been paid?`,
      );
    try {
      await apiFetch(`/library/issues/${item.id}/return`, {
        method: "POST",
        body: JSON.stringify({ fine_paid: finePaid }),
      });
      setMessage("Book returned successfully.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Library Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Catalog, student issues, returns, due dates, and fines.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-lg border border-orange-200 p-2.5 text-orange-700"
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5 lg:p-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Titles", data.books.length, BookOpen],
              [
                "Total Copies",
                data.books.reduce(
                  (sum, book) => sum + Number(book.total_copies),
                  0,
                ),
                BookOpen,
              ],
              ["Issued", activeIssues.length, Clock],
              ["Overdue", overdue.length, Clock],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-orange-200 bg-white p-4"
              >
                <Icon size={17} className="text-orange-600" />
                <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={16} /> {message}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex border-b border-orange-200">
              {[
                ["books", "Book Catalog"],
                ["issues", "Issues & Returns"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${
                    tab === key
                      ? "border-orange-600 text-orange-700"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3">
                <Search size={15} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  className="w-44 bg-transparent py-2.5 text-sm outline-none"
                />
              </div>
              {tab === "books" && (
                <button
                  onClick={() => setBookModal({})}
                  className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={15} /> Add Book
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : tab === "books" ? (
            <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-orange-50 text-xs text-gray-600">
                  <tr>
                    {[
                      "Accession",
                      "Book",
                      "Category",
                      "Rack",
                      "Availability",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td className="px-4 py-3 font-mono text-xs">
                        {book.accession_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">
                          {book.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {book.author || "Unknown author"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{book.category || "-"}</td>
                      <td className="px-4 py-3">{book.rack || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-700">
                          {book.available_copies}/{book.total_copies}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setIssueBook(book)}
                            disabled={!Number(book.available_copies)}
                            className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 disabled:opacity-40"
                          >
                            Issue
                          </button>
                          <button
                            onClick={() => setBookModal(book)}
                            className="p-2 text-gray-500"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeBook(book.id)}
                            className="p-2 text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!books.length && (
                <p className="py-16 text-center text-sm text-gray-500">
                  No books found.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-orange-50 text-xs text-gray-600">
                  <tr>
                    {[
                      "Book",
                      "Student",
                      "Issue Date",
                      "Due / Return",
                      "Status",
                      "Fine",
                      "Action",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  {issues.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold">
                        {item.book_title}
                      </td>
                      <td className="px-4 py-3">
                        <p>{item.student_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.roll_number} | {item.class}-{item.section}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {item.issue_date?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        {(item.return_date || item.due_date)?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.current_status === "Overdue"
                              ? "bg-red-50 text-red-700"
                              : item.return_date
                                ? "bg-gray-100 text-gray-600"
                                : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {item.current_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        Rs {Number(item.calculated_fine || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {!item.return_date && (
                          <button
                            onClick={() => returnBook(item)}
                            className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700"
                          >
                            <RotateCcw size={13} /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!issues.length && (
                <p className="py-16 text-center text-sm text-gray-500">
                  No issue records.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {bookModal && (
        <BookModal
          initial={bookModal.id ? bookModal : emptyBook}
          onClose={() => setBookModal(null)}
          onSave={saveBook}
        />
      )}
      {issueBook && (
        <IssueModal
          book={issueBook}
          students={data.students}
          onClose={() => setIssueBook(null)}
          onSave={issue}
        />
      )}
    </div>
  );
}

function BookModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptyBook, ...initial });
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <Modal title={initial.id ? "Edit Book" : "Add Book"} onClose={onClose}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {[
          ["accession_number", "Accession Number", true],
          ["title", "Title", true],
          ["author", "Author"],
          ["isbn", "ISBN"],
          ["category", "Category"],
          ["publisher", "Publisher"],
          ["publication_year", "Publication Year", false, "number"],
          ["rack", "Rack"],
          ["total_copies", "Total Copies", true, "number"],
        ].map(([key, label, required, type = "text"]) => (
          <label key={key} className="text-xs font-semibold text-gray-500">
            {label}
            <input
              required={required}
              type={type}
              min={type === "number" ? 0 : undefined}
              value={form[key] ?? ""}
              onChange={(event) => set(key, event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-orange-100 p-4">
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
          Save Book
        </button>
      </div>
    </Modal>
  );
}

function IssueModal({ book, students, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    student_id: "",
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    notes: "",
  }));
  return (
    <Modal title={`Issue: ${book.title}`} onClose={onClose}>
      <div className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-gray-500">
          Student
          <select
            value={form.student_id}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                student_id: event.target.value,
              }))
            }
            className="mt-1.5 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} | {student.roll_number} | {student.class}-
                {student.section}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-gray-500">
          Due Date
          <input
            type="date"
            value={form.due_date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                due_date: event.target.value,
              }))
            }
            className="mt-1.5 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-gray-500">
          Notes
          <textarea
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            className="mt-1.5 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-orange-100 p-4">
        <button
          onClick={onClose}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          disabled={!form.student_id || !form.due_date}
          onClick={() => onSave(form)}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Issue Book
        </button>
      </div>
    </Modal>
  );
}
