"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Clock, Loader2, RefreshCw } from "lucide-react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";

export default function StudentLibraryPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await apiFetch("/library/student"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold">My Library</h1>
              <p className="mt-1 text-sm text-gray-500">
                Issued books, due dates, returns, and fines.
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
        <div className="p-5 lg:p-8">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {issues.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-orange-200 bg-white p-4"
                >
                  <BookOpen size={20} className="text-orange-600" />
                  <p className="mt-3 font-bold">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.author || "-"}</p>
                  <div className="mt-4 space-y-1 text-xs text-gray-600">
                    <p>Issued: {item.issue_date?.slice(0, 10)}</p>
                    <p>Due: {item.due_date?.slice(0, 10)}</p>
                    <p>
                      Fine: Rs{" "}
                      {Number(item.calculated_fine || 0).toLocaleString(
                        "en-IN",
                      )}
                    </p>
                  </div>
                  <span
                    className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                      item.current_status === "Overdue"
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    <Clock size={12} /> {item.current_status}
                  </span>
                </div>
              ))}
              {!issues.length && (
                <p className="sm:col-span-2 lg:col-span-3 py-20 text-center text-sm text-gray-500">
                  No library issue history.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
