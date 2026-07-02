"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Loader2, QrCode } from "lucide-react";
import StudentSidebar from "@/components/StudentSidebar";
import { apiFetch } from "@/lib/api";

export default function StudentSmartAttendancePage() {
  const [code, setCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const stopCamera = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const submit = async (sessionCode = code) => {
    if (!sessionCode) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch("/smart-attendance/scan", {
        method: "POST",
        body: JSON.stringify({ session_code: sessionCode }),
      });
      setMessage(result.message);
      stopCamera();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startCamera = async () => {
    setError("");
    if (!("BarcodeDetector" in window)) {
      setError("QR camera scanning is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const results = await detector.detect(videoRef.current).catch(() => []);
        if (results[0]?.rawValue) {
          setCode(results[0].rawValue);
          submit(results[0].rawValue);
        }
      }, 700);
    } catch {
      setError("Camera permission is required to scan attendance QR.");
      stopCamera();
    }
  };

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />
      <main className="min-w-0 flex-1">
        <header className="border-b border-orange-100 bg-orange-50/90 px-5 py-5 lg:px-8">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">QR Attendance</h1>
            <p className="mt-1 text-sm text-gray-500">
              Scan the active QR for your class.
            </p>
          </div>
        </header>
        <div className="mx-auto max-w-xl space-y-5 p-5 lg:p-8">
          {message && (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircle2 size={20} />
              <p className="font-semibold">{message}</p>
            </div>
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <section className="rounded-lg border border-orange-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <QrCode className="text-orange-600" />
              </div>
              <h2 className="font-bold text-gray-900">Scan QR Code</h2>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className={`aspect-video w-full object-cover ${
                  cameraOn ? "block" : "hidden"
                }`}
                muted
                playsInline
              />
              {!cameraOn && (
                <div className="flex aspect-video items-center justify-center text-gray-400">
                  <CameraOff size={32} />
                </div>
              )}
            </div>
            <button
              onClick={cameraOn ? stopCamera : startCamera}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
              {cameraOn ? "Stop Camera" : "Open Camera"}
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px flex-1 bg-orange-100" />
              OR
              <span className="h-px flex-1 bg-orange-100" />
            </div>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste attendance QR value"
              className="w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm"
            />
            <button
              onClick={() => submit()}
              disabled={!code || submitting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Mark Attendance
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
