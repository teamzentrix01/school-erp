"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  FileQuestion,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch, getMediaUrl } from "@/lib/api";

export default function StudentExaminationsPage() {
  const [data, setData] = useState({
    student: null,
    schedule: [],
    question_papers: [],
    admit_cards: [],
  });
  const [tab, setTab] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printCard, setPrintCard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch("/examinations/student"));
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
              <h1 className="text-xl font-bold text-gray-900">
                My Examinations
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Date sheets, released papers, and admit cards.
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
            <div className="overflow-x-auto rounded-lg border border-orange-200 bg-white">
              <table className="w-full min-w-[750px] text-sm">
                <thead className="bg-orange-50 text-xs text-gray-600">
                  <tr>
                    {[
                      "Exam",
                      "Subject",
                      "Date",
                      "Time",
                      "Room",
                      "Instructions",
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
                      <td className="px-4 py-3">{item.subject}</td>
                      <td className="px-4 py-3">
                        {item.exam_date?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        {item.start_time?.slice(0, 5)}-
                        {item.end_time?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3">{item.room || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.instructions || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.schedule.length && (
                <Empty text="No published date sheet." />
              )}
            </div>
          ) : tab === "papers" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.question_papers.map((paper) => (
                <a
                  key={paper.id}
                  href={getMediaUrl(paper.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-orange-200 bg-white p-4"
                >
                  <FileQuestion size={20} className="text-orange-600" />
                  <p className="mt-3 font-bold text-gray-900">{paper.title}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {paper.exam_name} | {paper.subject}
                  </p>
                </a>
              ))}
              {!data.question_papers.length && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Empty text="No question papers have been released." />
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.admit_cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-lg border border-orange-200 bg-white p-4"
                >
                  <CreditCard size={20} className="text-orange-600" />
                  <p className="mt-3 font-bold">{card.exam_name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Card No. {card.card_number}
                  </p>
                  <button
                    onClick={() => setPrintCard(card)}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <Printer size={13} /> View / Print
                  </button>
                </div>
              ))}
              {!data.admit_cards.length && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Empty text="No admit cards published." />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {printCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="print:hidden mb-3 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Print
              </button>
              <button
                onClick={() => setPrintCard(null)}
                className="rounded-lg bg-white px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
            <div id="student-admit-card-print" className="bg-white p-7">
              <div className="border-b pb-5 text-center">
                <h2 className="text-2xl font-bold">EduERP College</h2>
                <p>{printCard.exam_name} Admit Card</p>
              </div>
              <div className="grid grid-cols-2 gap-4 py-5 text-sm">
                <p>
                  Student: <strong>{data.student?.name}</strong>
                </p>
                <p>
                  Roll No: <strong>{data.student?.roll_number}</strong>
                </p>
                <p>
                  Class:{" "}
                  <strong>
                    {data.student?.class}-{data.student?.section}
                  </strong>
                </p>
                <p>
                  Card No: <strong>{printCard.card_number}</strong>
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
                  {data.schedule
                    .filter(
                      (item) =>
                        Number(item.exam_id) === Number(printCard.exam_id),
                    )
                    .map((item) => (
                      <tr key={item.id}>
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
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-16 text-center text-sm text-gray-500">{text}</p>;
}
