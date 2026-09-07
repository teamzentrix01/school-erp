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
import QRCode from "qrcode";

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
  const [verificationQr, setVerificationQr] = useState("");

  useEffect(() => {
    if (!printCard?.card_number) return setVerificationQr("");
    QRCode.toDataURL(`EDUERP-ADMIT-CARD:${printCard.card_number}`, { width: 140, margin: 1 })
      .then(setVerificationQr)
      .catch(() => setVerificationQr(""));
  }, [printCard]);

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
            <div id="student-admit-card-print" className="relative bg-white p-8 text-slate-900 border-[6px] border-double border-blue-900" style={{ fontFamily: "Arial, 'Nirmala UI', sans-serif" }}>
              <div className="flex items-center gap-5 border-b-2 border-blue-900 pb-4">
                <div className="h-20 w-20 shrink-0 rounded-full border-2 border-blue-900 bg-blue-50 p-2 flex items-center justify-center">
                  {process.env.NEXT_PUBLIC_SCHOOL_LOGO_URL ? <img src={getMediaUrl(process.env.NEXT_PUBLIC_SCHOOL_LOGO_URL)} alt="School logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs font-bold text-blue-900 text-center">SCHOOL<br/>LOGO</span>}
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xl font-bold text-blue-950">{process.env.NEXT_PUBLIC_SCHOOL_NAME_HI || "विद्यालय का नाम"}</p>
                  <h2 className="text-2xl font-extrabold uppercase tracking-wide text-blue-900">{process.env.NEXT_PUBLIC_SCHOOL_NAME || "EduERP School"}</h2>
                  <p className="text-xs text-slate-600">{process.env.NEXT_PUBLIC_SCHOOL_ADDRESS || "School Address"}</p>
                  <p className="text-[11px] font-semibold">UDISE / Affiliation No.: {process.env.NEXT_PUBLIC_SCHOOL_CODE || "-"}</p>
                </div>
                <div className="h-28 w-24 shrink-0 overflow-hidden border-2 border-slate-700 bg-slate-100 flex items-center justify-center">
                  {data.student?.photo_url ? <img src={getMediaUrl(data.student.photo_url)} alt={data.student.name} className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-400">STUDENT PHOTO</span>}
                </div>
              </div>
              <div className="my-4 rounded bg-blue-900 py-2 text-center text-white">
                <h3 className="text-lg font-bold">प्रवेश पत्र / ADMIT CARD</h3><p className="text-sm">{printCard.exam_name} · {printCard.academic_year}</p>
              </div>
              <div className="grid grid-cols-2 border border-slate-400 text-sm [&>p]:border-b [&>p]:border-slate-300 [&>p]:p-2 odd:[&>p]:border-r">
                <p>छात्र का नाम / Student Name: <strong>{data.student?.name}</strong></p>
                <p>अनुक्रमांक / Roll No.: <strong>{data.student?.roll_number}</strong></p>
                <p>प्रवेश संख्या / Admission No.: <strong>{data.student?.student_id}</strong></p>
                <p>कक्षा / Class: <strong>{data.student?.class}-{data.student?.section}</strong></p>
                <p>पिता/अभिभावक / Guardian: <strong>{data.student?.guardian_name || "-"}</strong></p>
                <p>जन्म तिथि / DOB: <strong>{data.student?.date_of_birth?.slice(0,10) || "-"}</strong></p>
                <p className="col-span-2">Admit Card No.: <strong>{printCard.card_number}</strong></p>
              </div>
              <h4 className="mt-5 mb-2 text-center font-bold text-blue-950">परीक्षा कार्यक्रम / EXAMINATION DATE SHEET</h4>
              <table className="w-full border-collapse text-xs">
                <thead className="bg-blue-900 text-white">
                  <tr>
                    <th className="border border-blue-950 p-2 text-left">विषय / Subject</th><th className="border border-blue-950 p-2">दिनांक / Date</th><th className="border border-blue-950 p-2">दिन / Day</th><th className="border border-blue-950 p-2">समय / Time</th><th className="border border-blue-950 p-2">कक्ष / Room</th>
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
                        <td className="border border-slate-300 p-2 font-semibold">{item.subject}</td>
                        <td className="border border-slate-300 p-2 text-center">{item.exam_date?.slice(0, 10)}</td>
                        <td className="border border-slate-300 p-2 text-center">{item.exam_date ? new Date(`${item.exam_date.slice(0,10)}T00:00:00`).toLocaleDateString("en-IN",{weekday:"short"}) : "-"}</td>
                        <td className="border border-slate-300 p-2 text-center">
                          {item.start_time?.slice(0, 5)}-
                          {item.end_time?.slice(0, 5)}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">{item.room || "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-5 rounded border border-amber-400 bg-amber-50 p-3 text-[11px] leading-5"><strong>महत्वपूर्ण निर्देश / IMPORTANT INSTRUCTIONS</strong><br/>1. परीक्षा केंद्र पर निर्धारित समय से 30 मिनट पहले उपस्थित हों। / Report 30 minutes before the examination.<br/>2. प्रवेश पत्र और विद्यालय पहचान पत्र साथ लाना अनिवार्य है। / Carry this admit card and school ID.<br/>3. इलेक्ट्रॉनिक उपकरण परीक्षा कक्ष में वर्जित हैं। / Electronic devices are prohibited.</div>
              <div className="mt-8 grid grid-cols-4 items-end text-center text-xs font-semibold"><p>छात्र हस्ताक्षर<br/>Student Signature</p><p>कक्षा अध्यापक<br/>Class Teacher</p><p>प्रधानाचार्य<br/>Principal</p><div>{verificationQr&&<img src={verificationQr} alt="Admit card verification QR" className="mx-auto h-20 w-20"/>}<p>Verification QR</p></div></div>
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
