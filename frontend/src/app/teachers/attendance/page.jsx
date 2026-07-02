"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, QrCode, RefreshCw, Square, Users } from "lucide-react";
import TeacherSidebar from "@/components/TeacherSidebar";
import { apiFetch } from "@/lib/api";

export default function TeacherQrAttendancePage() {
  const [data, setData] = useState({ classes: [], sessions: [], events: [] });
  const [form, setForm] = useState({ class_id: "", expires_in_minutes: 15 });
  const [activeQr, setActiveQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/smart-attendance");
      setData({
        classes: Array.isArray(result.classes) ? result.classes : [],
        sessions: Array.isArray(result.sessions) ? result.sessions : [],
        events: Array.isArray(result.events) ? result.events : [],
      });
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setSaving(true);
    try {
      const session = await apiFetch("/smart-attendance/sessions", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setActiveQr(session);
      setError("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const closeSession = async (id) => {
    try {
      await apiFetch(`/smart-attendance/sessions/${id}/close`, {
        method: "PUT",
        body: "{}",
      });
      if (activeQr?.id === id) setActiveQr(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <TeacherSidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">QR Attendance</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate QR codes for your assigned classes.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-lg border border-orange-200 p-2.5 text-orange-700"
              title="Refresh attendance"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5 lg:p-8">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <section className="rounded-lg border border-orange-200 bg-white p-5">
              <h2 className="flex items-center gap-2 font-bold">
                <QrCode size={18} className="text-orange-600" /> Generate Class
                QR
              </h2>
              <select
                value={form.class_id}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    class_id: event.target.value,
                  }))
                }
                className="mt-4 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              >
                <option value="">Select assigned class</option>
                {data.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {[item.grade || item.class_name, item.section]
                      .filter(Boolean)
                      .join("-")}
                  </option>
                ))}
              </select>
              <label className="mt-3 block text-xs font-semibold text-gray-500">
                Validity (minutes)
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={form.expires_in_minutes}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      expires_in_minutes: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                />
              </label>
              <button
                onClick={generate}
                disabled={!form.class_id || saving}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <QrCode size={17} />
                )}
                Generate QR
              </button>
              {activeQr && (
                <div className="mt-5 text-center">
                  <img
                    src={activeQr.qr_data_url}
                    alt="Class attendance QR"
                    className="mx-auto w-64"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Expires{" "}
                    {new Date(activeQr.expires_at).toLocaleString("en-IN")}
                  </p>
                  <button
                    onClick={() => closeSession(activeQr.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    <Square size={14} /> Close Session
                  </button>
                </div>
              )}
              {!loading && data.classes.length === 0 && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  No class is assigned to your teacher profile.
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-lg border border-orange-200 bg-white">
              <div className="flex items-center justify-between border-b border-orange-100 p-4">
                <h2 className="font-bold">My QR Sessions</h2>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Users size={16} /> {data.events.length} scans
                </span>
              </div>
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-orange-600" />
                </div>
              ) : data.sessions.length === 0 ? (
                <p className="py-20 text-center text-sm text-gray-500">
                  No QR sessions generated yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-orange-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Scans</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sessions.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium">
                            {[item.grade || item.class_name, item.section]
                              .filter(Boolean)
                              .join("-")}
                          </td>
                          <td className="px-4 py-3">
                            {String(item.attendance_date).slice(0, 10)}
                          </td>
                          <td className="px-4 py-3">{item.event_count}</td>
                          <td className="px-4 py-3">{item.status}</td>
                          <td className="px-4 py-3">
                            {item.status === "Active" && (
                              <button
                                onClick={() => closeSession(item.id)}
                                className="font-semibold text-red-600"
                              >
                                Close
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
