import { getMediaUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

const SCHOOL_NAME =
  "PREM SINGH SWATANTRATA SENANI INTER COLLEGE BHATIYANA KHUSHALUR, BIJNOR";

const dateLabel = (value) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

export default function AdmitCardSheet({
  card,
  student,
  schedule,
  verificationQr,
  status,
}) {
  const profile = student || card;
  const [generatedQr, setGeneratedQr] = useState("");
  useEffect(() => {
    if (!card?.card_number) return;
    let active = true;
    QRCode.toDataURL(`EDUERP-ADMIT-CARD:${card.card_number}`, {
      width: 180,
      margin: 1,
    })
      .then((value) => {
        if (active) setGeneratedQr(value);
      })
      .catch(() => {
        if (active) setGeneratedQr("");
      });
    return () => {
      active = false;
    };
  }, [card?.card_number]);
  const scheduleSource = Array.isArray(schedule)
    ? schedule
    : Array.isArray(card?.schedule)
      ? card.schedule
      : [];
  const subjects = scheduleSource.filter((item) => item && item.subject);
  const classLabel = `${profile.class || "-"}${
    profile.section ? `-${profile.section}` : ""
  }`;

  return (
    <article className="admit-card-sheet border-[3px] border-double border-slate-900 bg-white text-slate-900 shadow print:shadow-none">
      <header className="border-b-2 border-slate-900 px-3 py-2 text-center">
        <p className="text-sm font-semibold">प्रवेश पत्र / ADMIT CARD</p>
        <h1 className="mt-1 text-lg font-extrabold uppercase leading-tight">
          {SCHOOL_NAME}
        </h1>
        <p className="mt-1 text-sm font-semibold">
          {card.exam_name || "Examination"}
          {card.academic_year ? ` · Academic Year ${card.academic_year}` : ""}
        </p>
      </header>

      <div className="admit-card-details grid grid-cols-[1fr_88px] border-b border-slate-700 p-3 text-sm">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 pr-3">
          <p>
            <strong>छात्र का नाम / Student:</strong><br />
            {profile.name || profile.student_name || "-"}
          </p>
          <p>
            <strong>अनुक्रमांक / Roll No.:</strong><br />
            {profile.roll_number || "-"}
          </p>
          <p>
            <strong>प्रवेश संख्या / Admission No.:</strong><br />
            {profile.student_id || card.student_id || "-"}
          </p>
          <p>
            <strong>कक्षा / Class:</strong><br />
            {classLabel}
          </p>
          <p>
            <strong>पिता का नाम / Father:</strong><br />
            {profile.guardian_name || "-"}
          </p>
          <p>
            <strong>जन्म तिथि / DOB:</strong><br />
            {profile.date_of_birth
              ? dateLabel(profile.date_of_birth)
              : "-"}
          </p>
          <p className="col-span-2">
            <strong>Admit Card No.:</strong> {card.card_number || "-"}
          </p>
          {status && (
            <p className="col-span-2">
              <strong>Status:</strong>{" "}
              <span className={status === "Released" ? "text-emerald-700" : "text-amber-700"}>
                {status}
              </span>
            </p>
          )}
        </div>
        <div className="admit-card-photo flex h-[106px] w-[82px] items-center justify-center overflow-hidden border-2 border-slate-700 bg-slate-100">
          {profile.photo_url ? (
            <img
              src={getMediaUrl(profile.photo_url)}
              alt={`${profile.name || profile.student_name || "Student"} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-1 text-center text-[9px] text-slate-400">
              STUDENT PHOTO
            </span>
          )}
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th className="border border-slate-800 p-2 text-left">Subject</th>
            <th className="border border-slate-800 p-2 text-center">Date</th>
            <th className="border border-slate-800 p-2 text-center">Time</th>
            <th className="border border-slate-800 p-2 text-center">Room</th>
          </tr>
        </thead>
        <tbody>
          {subjects.length ? (
            subjects.map((item, index) => (
              <tr key={`${item.id || item.subject}-${item.exam_date || index}`}>
                <td className="border border-slate-400 p-2 font-semibold">
                  {item.subject}
                </td>
                <td className="border border-slate-400 p-2 text-center">
                  {dateLabel(item.exam_date)}
                </td>
                <td className="border border-slate-400 p-2 text-center">
                  {item.start_time?.slice(0, 5) || "-"}-
                  {item.end_time?.slice(0, 5) || "-"}
                </td>
                <td className="border border-slate-400 p-2 text-center">
                  {item.room || "-"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="border border-slate-400 p-3 text-center">
                No examination schedule available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="admit-card-instructions mt-4 border border-slate-400 p-3 text-sm leading-5">
        <strong>Important Instructions:</strong> Carry this admit card and school
        identity card. Report at the examination centre 30 minutes before the
        scheduled time. Electronic devices are not allowed.
      </div>

      <div className="admit-card-footer mt-5 grid grid-cols-4 items-end gap-3 text-center text-sm font-semibold">
        <p>Student Signature</p>
        <p>Class Teacher</p>
        <p>Principal</p>
        {(verificationQr || generatedQr) ? (
          <div>
            <img src={verificationQr || generatedQr} alt="Admit card verification QR" className="admit-card-qr mx-auto h-16 w-16" />
            <p>Verification QR</p>
          </div>
        ) : (
          <p>School Seal</p>
        )}
      </div>
    </article>
  );
}
