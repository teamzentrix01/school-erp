"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle, Loader2, RefreshCw, Save, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";

const today = new Date().toISOString().slice(0, 10);
const statuses = ["Present", "Absent", "Leave"];

export default function TeacherAttendancePage() {
  const [date, setDate] = useState(today);
  const [teachers, setTeachers] = useState([]);
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiFetch(`/attendance/teachers?date=${date}`);
      setTeachers(data.teachers || []);
      setDraft(Object.fromEntries((data.teachers || []).map((teacher) => [teacher.teacher_id, teacher.status === "Not Marked" ? "Present" : teacher.status])));
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.toLowerCase();
    return teachers.filter((teacher) => `${teacher.name} ${teacher.employee_id || ""} ${teacher.subject || ""}`.toLowerCase().includes(query));
  }, [teachers, search]);

  async function save() {
    const changedRecords = teachers
      .filter((teacher) => teacher.status !== draft[teacher.teacher_id])
      .map((teacher) => ({ teacher_id: teacher.teacher_id, status: draft[teacher.teacher_id] }));
    if (!changedRecords.length) {
      setMessage({ type: "success", text: "No attendance changes to save." });
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch("/attendance/teachers", {
        method: "PUT",
        body: JSON.stringify({ date, records: changedRecords }),
      });
      await load();
      setMessage({ type: "success", text: `${result.message}. ${result.arrangement_required} period(s) need arrangement.` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50"><Sidebar /><main className="min-w-0 flex-1 p-5 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Teacher Attendance</h1><p className="mt-1 text-sm text-gray-500">Manually mark attendance used by teacher arrangements.</p></div>
        <button onClick={save} disabled={saving || loading || !teachers.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Attendance</button>
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row">
        <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><CalendarCheck size={16} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"><Search size={16} className="text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teacher" className="w-full text-sm outline-none" /></label>
        <button onClick={load} className="rounded-xl border p-2.5 text-gray-600"><RefreshCw size={17} /></button>
      </div>
      {message && <div className={`mt-4 rounded-xl p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message.text}</div>}
      <div className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
        {loading ? <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-600" /></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">Teacher</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Recorded via</th><th className="px-5 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{visible.map((teacher) => <tr key={teacher.teacher_id}><td className="px-5 py-4"><p className="font-semibold text-gray-900">{teacher.name}</p><p className="text-xs text-gray-400">{teacher.employee_id}</p></td><td className="px-5 py-4 text-gray-600">{teacher.subject || teacher.department || "—"}</td><td className="px-5 py-4 text-gray-500">{teacher.attendance_method || "Not marked"}</td><td className="px-5 py-4"><div className="flex gap-2">{statuses.map((status) => <button key={status} onClick={() => setDraft((current) => ({ ...current, [teacher.teacher_id]: status }))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${draft[teacher.teacher_id] === status ? status === "Present" ? "bg-green-600 text-white" : status === "Absent" ? "bg-red-600 text-white" : "bg-amber-500 text-white" : "bg-gray-100 text-gray-500"}`}>{draft[teacher.teacher_id] === status && <CheckCircle size={11} className="mr-1 inline" />}{status}</button>)}</div></td></tr>)}</tbody></table></div>}
      </div>
    </main></div>
  );
}
