"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Eye,
  FileQuestion,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";

const emptySchedule = {
  exam_id: "",
  subject: "",
  exam_date: "",
  start_time: "09:00",
  end_time: "12:00",
  room: "",
  instructions: "",
  published: false,
};

export default function ExaminationsPage() {
  const [data, setData] = useState({
    exams: [],
    schedule: [],
    question_papers: [],
    admit_card_batches: [],
  });
  const [tab, setTab] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleModal, setScheduleModal] = useState(null);
  const [paperForm, setPaperForm] = useState({
    exam_id: "",
    subject: "",
    title: "",
    access_status: "Restricted",
    release_at: "",
  });
  const [paperFile, setPaperFile] = useState(null);
  const [cards, setCards] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch("/examinations"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSchedule = async (form) => {
    await apiFetch(
      `/examinations/schedule${scheduleModal?.id ? `/${scheduleModal.id}` : ""}`,
      {
        method: scheduleModal?.id ? "PUT" : "POST",
        body: JSON.stringify(form),
      },
    );
    setScheduleModal(null);
    load();
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm("Delete this date-sheet entry?")) return;
    await apiFetch(`/examinations/schedule/${id}`, { method: "DELETE" });
    load();
  };

  const uploadPaper = async () => {
    if (!paperFile) return setError("Choose a question paper file.");
    const body = new FormData();
    Object.entries(paperForm).forEach(([key, value]) => {
      if (value) body.append(key, value);
    });
    body.append("file", paperFile);
    await apiFetch("/examinations/question-papers", { method: "POST", body });
    setPaperFile(null);
    setPaperForm((current) => ({ ...current, title: "", subject: "" }));
    load();
  };

  const togglePaper = async (paper) => {
    await apiFetch(`/examinations/question-papers/${paper.id}`, {
      method: "PUT",
      body: JSON.stringify({
        access_status:
          paper.access_status === "Published" ? "Restricted" : "Published",
        release_at: paper.release_at,
      }),
    });
    load();
  };

  const deletePaper = async (id) => {
    if (!window.confirm("Delete this question paper?")) return;
    await apiFetch(`/examinations/question-papers/${id}`, { method: "DELETE" });
    load();
  };

  const generateCards = async (examId) => {
    const result = await apiFetch(
      `/examinations/admit-cards/${examId}/generate`,
      { method: "POST", body: "{}" },
    );
    window.alert(result.message);
    load();
  };

  const publishCards = async (examId, published = true) => {
    await apiFetch(`/examinations/admit-cards/${examId}/publish`, {
      method: "PUT",
      body: JSON.stringify({ published }),
    });
    load();
  };

  const viewCards = async (examId) => {
    setCards(await apiFetch(`/examinations/admit-cards/${examId}`));
  };

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4 pl-10 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Examination Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Date sheets, question papers, and admit cards.
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
          <div className="flex overflow-x-auto border-b border-orange-200">
            {[
              ["schedule", "Date Sheet", CalendarDays],
              ["papers", "Question Papers", FileQuestion],
              ["cards", "Admit Cards", CreditCard],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
                  tab === key
                    ? "border-orange-600 text-orange-700"
                    : "border-transparent text-gray-500"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-orange-600" />
            </div>
          ) : tab === "schedule" ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setScheduleModal({})}
                  className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={15} /> Add Date-Sheet Entry
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      {[
                        "Exam",
                        "Class",
                        "Subject",
                        "Date",
                        "Time",
                        "Room",
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
                    {data.schedule.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold">
                          {item.exam_name}
                        </td>
                        <td className="px-4 py-3">
                          {item.class}
                          {item.section ? `-${item.section}` : ""}
                        </td>
                        <td className="px-4 py-3">{item.subject}</td>
                        <td className="px-4 py-3">
                          {item.exam_date?.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          {item.start_time?.slice(0, 5)}-
                          {item.end_time?.slice(0, 5)}
                        </td>
                        <td className="px-4 py-3">{item.room || "-"}</td>
                        <td className="px-4 py-3">
                          {item.published ? "Published" : "Draft"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setScheduleModal(item)}
                            className="px-2 py-1 text-xs text-orange-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSchedule(item.id)}
                            className="p-2 text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.schedule.length && (
                  <p className="py-16 text-center text-sm text-gray-500">
                    No date-sheet entries.
                  </p>
                )}
              </div>
            </>
          ) : tab === "papers" ? (
            <>
              <section className="grid gap-3 rounded-lg border border-orange-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
                <select
                  value={paperForm.exam_id}
                  onChange={(event) =>
                    setPaperForm((value) => ({
                      ...value,
                      exam_id: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select exam</option>
                  {data.exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} | {exam.class}
                      {exam.section ? `-${exam.section}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  value={paperForm.subject}
                  onChange={(event) =>
                    setPaperForm((value) => ({
                      ...value,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Subject"
                  className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                />
                <input
                  value={paperForm.title}
                  onChange={(event) =>
                    setPaperForm((value) => ({
                      ...value,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Paper title"
                  className="rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
                />
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) =>
                    setPaperFile(event.target.files?.[0] || null)
                  }
                  className="self-center text-sm"
                />
                <button
                  onClick={uploadPaper}
                  className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Upload size={15} /> Upload
                </button>
              </section>
              <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      {[
                        "Exam",
                        "Subject",
                        "Title",
                        "Release",
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
                    {data.question_papers.map((paper) => (
                      <tr key={paper.id}>
                        <td className="px-4 py-3">{paper.exam_name}</td>
                        <td className="px-4 py-3">{paper.subject}</td>
                        <td className="px-4 py-3">
                          <a
                            href={getMediaUrl(paper.file_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-orange-700"
                          >
                            {paper.title}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {paper.release_at
                            ? new Date(paper.release_at).toLocaleString("en-IN")
                            : "Immediate"}
                        </td>
                        <td className="px-4 py-3">{paper.access_status}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => togglePaper(paper)}
                            className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
                          >
                            {paper.access_status === "Published"
                              ? "Restrict"
                              : "Publish"}
                          </button>
                          <button
                            onClick={() => deletePaper(paper.id)}
                            className="p-2 text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-orange-50 text-xs text-gray-600">
                  <tr>
                    {["Exam", "Class", "Generated", "Published", "Actions"].map(
                      (heading) => (
                        <th key={heading} className="px-4 py-3 text-left">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  {data.exams.map((exam) => {
                    const batch = data.admit_card_batches.find(
                      (item) => Number(item.exam_id) === Number(exam.id),
                    );
                    return (
                      <tr key={exam.id}>
                        <td className="px-4 py-3 font-semibold">{exam.name}</td>
                        <td className="px-4 py-3">
                          {exam.class}
                          {exam.section ? `-${exam.section}` : ""}
                        </td>
                        <td className="px-4 py-3">{batch?.card_count || 0}</td>
                        <td className="px-4 py-3">
                          {batch?.published_count || 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => generateCards(exam.id)}
                              className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
                            >
                              Generate
                            </button>
                            <button
                              onClick={() => publishCards(exam.id)}
                              disabled={!batch?.card_count}
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                            >
                              <Send size={12} /> Publish
                            </button>
                            <button
                              onClick={() => viewCards(exam.id)}
                              disabled={!batch?.card_count}
                              className="p-2 text-gray-500 disabled:opacity-40"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!data.exams.length && (
                <p className="py-16 text-center text-sm text-gray-500">
                  Create an exam in Results first.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      {scheduleModal && (
        <ScheduleModal
          exams={data.exams}
          initial={scheduleModal.id ? scheduleModal : emptySchedule}
          onClose={() => setScheduleModal(null)}
          onSave={saveSchedule}
        />
      )}
      {!!cards.length && (
        <CardsModal cards={cards} onClose={() => setCards([])} />
      )}
    </div>
  );
}

function ScheduleModal({ exams, initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptySchedule, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || "Failed to save examination entry");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold">Date-Sheet Entry</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <select
            value={form.exam_id}
            onChange={(event) => set("exam_id", event.target.value)}
            className="sm:col-span-2 rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
          >
            <option value="">Select exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} | {exam.class}
                {exam.section ? `-${exam.section}` : ""}
              </option>
            ))}
          </select>
          {[
            ["subject", "Subject", "text"],
            ["exam_date", "Date", "date"],
            ["start_time", "Start Time", "time"],
            ["end_time", "End Time", "time"],
            ["room", "Room", "text"],
          ].map(([key, label, type]) => (
            <label key={key} className="text-xs font-semibold text-gray-500">
              {label}
              <input
                type={type}
                min={type === "date" ? "1900-01-01" : undefined}
                max={type === "date" ? "2100-12-31" : undefined}
                value={form[key] ?? ""}
                onChange={(event) => set(key, event.target.value)}
                className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
              />
            </label>
          ))}
          <label className="flex items-center gap-2 self-end py-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.published)}
              onChange={(event) => set("published", event.target.checked)}
            />
            Publish to students
          </label>
          <textarea
            value={form.instructions || ""}
            onChange={(event) => set("instructions", event.target.value)}
            placeholder="Instructions"
            className="sm:col-span-2 rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          {error && (
            <p className="mr-auto self-center text-sm text-red-600">{error}</p>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardsModal({ cards, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="print:hidden mb-3 flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Printer size={15} /> Print All
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-white p-2 text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        <div id="admit-cards-print" className="space-y-4">
          {cards.map((card) => (
            <div key={card.id} className="bg-white p-6 shadow">
              <div className="border-b pb-4 text-center">
                <h2 className="text-xl font-bold">EduERP College</h2>
                <p className="text-sm">{card.exam_name} Admit Card</p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 text-sm">
                <p>
                  Student: <strong>{card.student_name}</strong>
                </p>
                <p>
                  Roll No: <strong>{card.roll_number}</strong>
                </p>
                <p>
                  Class:{" "}
                  <strong>
                    {card.class}
                    {card.section ? `-${card.section}` : ""}
                  </strong>
                </p>
                <p>
                  Card No: <strong>{card.card_number}</strong>
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="p-2 text-left">Subject</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-left">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {(card.schedule || []).map((item) => (
                    <tr key={`${item.subject}-${item.exam_date}`}>
                      <td className="p-2">{item.subject}</td>
                      <td className="p-2">{item.exam_date?.slice(0, 10)}</td>
                      <td className="p-2">
                        {item.start_time?.slice(0, 5)}-
                        {item.end_time?.slice(0, 5)}
                      </td>
                      <td className="p-2">{item.room || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
