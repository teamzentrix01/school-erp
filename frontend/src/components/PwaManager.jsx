"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

export default function PwaManager() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(() =>
    typeof window !== "undefined" &&
    Boolean(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone),
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) =>
        console.error("Service worker registration failed:", error),
      );
    }

    const onPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!installEvent && !isIos) return null;

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } else {
      setShowIosHelp(true);
    }
  }

  return (
    <>
      <button onClick={install} className="pwa-install-button" aria-label="Install EduERP app">
        <Download size={17} /> Install App
      </button>
      {showIosHelp && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between"><h2 className="font-bold">Install EduERP</h2><button onClick={() => setShowIosHelp(false)}><X size={18} /></button></div>
            <p className="mt-3 text-sm text-gray-600">Safari mein <Share2 size={15} className="inline" /> Share button tap karein, phir <strong>Add to Home Screen</strong> select karein.</p>
          </div>
        </div>
      )}
    </>
  );
}
