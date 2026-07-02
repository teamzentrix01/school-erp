"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  Fingerprint,
  Loader2,
  QrCode,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";

export default function SmartAttendancePage() {
  const [data, setData] = useState({
    sessions: [],
    events: [],
    identities: [],
    classes: [],
    students: [],
    teachers: [],
  });
  const [tab, setTab] = useState("qr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrSession, setQrSession] = useState(null);
  const [qrForm, setQrForm] = useState({
    class_id: "",
    expires_in_minutes: 15,
  });
  const [identity, setIdentity] = useState({
    subject_type: "Teacher",
    subject_id: "",
    attendance_method: "Face",
    external_identifier: "",
    device_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch("/smart-attendance"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createQr = async () => {
    try {
      const session = await apiFetch("/smart-attendance/sessions", {
        method: "POST",
        body: JSON.stringify(qrForm),
      });
      setQrSession(session);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const closeQr = async (id) => {
    await apiFetch(`/smart-attendance/sessions/${id}/close`, {
      method: "PUT",
      body: "{}",
    });
    if (qrSession?.id === id) setQrSession(null);
    load();
  };

  const enroll = async () => {
    try {
      await apiFetch("/smart-attendance/identities", {
        method: "POST",
        body: JSON.stringify(identity),
      });
      setIdentity((current) => ({
        ...current,
        subject_id: "",
        external_identifier: "",
      }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const people =
    identity.subject_type === "Teacher" ? data.teachers : data.students;

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Smart Attendance
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                QR sessions, identity enrollment, and device events.
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
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["QR Sessions", data.sessions.length, QrCode],
              [
                "Face IDs",
                data.identities.filter((i) => i.attendance_method === "Face")
                  .length,
                Camera,
              ],
              [
                "Biometric IDs",
                data.identities.filter(
                  (i) => i.attendance_method === "Biometric",
                ).length,
                Fingerprint,
              ],
              ["Recent Events", data.events.length, UserCheck],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-orange-200 bg-white p-4"
              >
                <Icon size={18} className="text-orange-600" />
                <p className="mt-3 text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex border-b border-orange-200">
            {[
              ["qr", "QR Attendance"],
              ["identity", "Face / Biometric"],
              ["events", "Event Log"],
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
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : tab === "qr" ? (
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <section className="rounded-lg border border-orange-200 bg-white p-5">
                <h2 className="font-bold">Generate Class QR</h2>
                <select
                  value={qrForm.class_id}
                  onChange={(event) =>
                    setQrForm((value) => ({
                      ...value,
                      class_id: event.target.value,
                    }))
                  }
                  className="mt-4 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select class</option>
                  {data.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.grade}-{item.section}
                    </option>
                  ))}
                </select>
                <label className="mt-3 block text-xs font-semibold text-gray-500">
                  Validity (minutes)
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={qrForm.expires_in_minutes}
                    onChange={(event) =>
                      setQrForm((value) => ({
                        ...value,
                        expires_in_minutes: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  onClick={createQr}
                  disabled={!qrForm.class_id}
                  className="mt-4 w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Generate QR
                </button>
                {qrSession && (
                  <div className="mt-5 text-center">
                    <img
                      src={qrSession.qr_data_url}
                      alt="Attendance QR"
                      className="mx-auto w-64"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Expires{" "}
                      {new Date(qrSession.expires_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </section>
              <SessionTable sessions={data.sessions} onClose={closeQr} />
            </div>
          ) : tab === "identity" ? (
            <>
              <section className="grid gap-3 rounded-lg border border-orange-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
                <select
                  value={identity.subject_type}
                  onChange={(event) =>
                    setIdentity((value) => ({
                      ...value,
                      subject_type: event.target.value,
                      subject_id: "",
                    }))
                  }
                  className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                >
                  <option>Teacher</option>
                  <option>Student</option>
                </select>
                <select
                  value={identity.subject_id}
                  onChange={(event) =>
                    setIdentity((value) => ({
                      ...value,
                      subject_id: event.target.value,
                    }))
                  }
                  className="lg:col-span-2 rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} |{" "}
                      {person.employee_id || person.roll_number || person.id}
                    </option>
                  ))}
                </select>
                <select
                  value={identity.attendance_method}
                  onChange={(event) =>
                    setIdentity((value) => ({
                      ...value,
                      attendance_method: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                >
                  <option>Face</option>
                  <option>Biometric</option>
                </select>
                <input
                  value={identity.external_identifier}
                  onChange={(event) =>
                    setIdentity((value) => ({
                      ...value,
                      external_identifier: event.target.value,
                    }))
                  }
                  placeholder="Device identity ID"
                  className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                />
                <button
                  onClick={enroll}
                  className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Enroll
                </button>
              </section>
              <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      {[
                        "Person",
                        "Type",
                        "Method",
                        "External ID",
                        "Device",
                        "Status",
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {data.identities.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold">
                          {item.subject_name}
                        </td>
                        <td className="px-4 py-3">{item.subject_type}</td>
                        <td className="px-4 py-3">{item.attendance_method}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.external_identifier}
                        </td>
                        <td className="px-4 py-3">{item.device_id || "-"}</td>
                        <td className="px-4 py-3">
                          {item.active ? "Active" : "Inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EventTable events={data.events} />
          )}
        </div>
      </main>
    </div>
  );
}

function SessionTable({ sessions, onClose }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
      <table className="w-full min-w-[650px] text-sm">
        <thead className="bg-orange-50 text-xs text-gray-600">
          <tr>
            {["Class", "Date", "Expires", "Scans", "Status", "Action"].map(
              (heading) => (
                <th key={heading} className="px-4 py-3 text-left">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100">
          {sessions.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                {item.grade || item.class_name}-{item.section}
              </td>
              <td className="px-4 py-3">
                {item.attendance_date?.slice(0, 10)}
              </td>
              <td className="px-4 py-3">
                {new Date(item.expires_at).toLocaleTimeString("en-IN")}
              </td>
              <td className="px-4 py-3">{item.event_count}</td>
              <td className="px-4 py-3">{item.status}</td>
              <td className="px-4 py-3">
                {item.status === "Active" && (
                  <button
                    onClick={() => onClose(item.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
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
  );
}

function EventTable({ events }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-orange-50 text-xs text-gray-600">
          <tr>
            {["Person", "Type", "Method", "Time", "Device", "Confidence"].map(
              (heading) => (
                <th key={heading} className="px-4 py-3 text-left">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100">
          {events.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <p className="font-semibold">{item.subject_name}</p>
                <p className="text-xs text-gray-500">{item.subject_code}</p>
              </td>
              <td className="px-4 py-3">{item.subject_type}</td>
              <td className="px-4 py-3">{item.attendance_method}</td>
              <td className="px-4 py-3">
                {new Date(item.event_time).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3">{item.device_id || "-"}</td>
              <td className="px-4 py-3">{item.confidence || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && (
        <p className="py-16 text-center text-sm text-gray-500">
          No smart-attendance events.
        </p>
      )}
    </div>
  );
}
