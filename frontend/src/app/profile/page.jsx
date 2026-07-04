"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PortalTopbar from "@/components/PortalTopbar";
import { apiFetch, getUser, logout } from "@/lib/api";
import { LogOut, Mail, Shield, User } from "lucide-react";

export default function AdminProfilePage() {
  const [user, setUser] = useState(() => getUser());
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const fresh = await apiFetch("/auth/me");
      if (fresh) setUser(fresh);
      setError("");
    } catch {
      setError("Could not refresh profile details.");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="portal-saffron flex min-h-screen bg-orange-50/45">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <PortalTopbar role="admin" onRefresh={load} />
        <div className="p-6 lg:p-8">
          <div className="max-w-3xl rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 border-b border-orange-100 pb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-xl font-bold text-white">
                {(user?.name || "Admin User")
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {user?.name || "Admin User"}
                </h1>
                <p className="text-sm capitalize text-slate-500">
                  {user?.role || "admin"} profile
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                <User size={18} className="mb-2 text-orange-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Name
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {user?.name || "Admin User"}
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                <Mail size={18} className="mb-2 text-orange-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {user?.email || "Not available"}
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                <Shield size={18} className="mb-2 text-orange-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Access
                </p>
                <p className="mt-1 font-semibold capitalize text-slate-800">
                  {user?.role || "admin"}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
