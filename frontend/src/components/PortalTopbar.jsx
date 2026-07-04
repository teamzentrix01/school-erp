"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LogOut,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";
import { apiFetch, getUser, logout } from "@/lib/api";

const ROLE_CONFIG = {
  admin: {
    accent: "orange",
    profileHref: "/profile",
    noticePath: "/admin/notices",
    searchSources: [
      { path: "/admin/students", type: "Student", href: "/students" },
      { path: "/admin/teachers", type: "Teacher", href: "/teachers" },
      { path: "/admin/classes", type: "Class", href: "/classes" },
    ],
  },
  teacher: {
    accent: "orange",
    profileHref: "/teachers/profile",
    noticePath: "/teacher/notices",
    searchSources: [
      { path: "/teacher/students", type: "Student", href: "/teachers/class" },
      { path: "/teacher/classes", type: "Class", href: "/teachers/class" },
    ],
  },
  student: {
    accent: "orange",
    profileHref: "/students/profile",
    noticePath: "/student/notices",
    searchSources: [
      { path: "/student/teachers", type: "Teacher", href: "/students/teachers" },
      { path: "/student/results", type: "Result", href: "/students/results" },
      { path: "/student/timetable", type: "Class", href: "/students/timetable" },
    ],
  },
};

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts.at(-1)?.[0] || "")).slice(0, 2).toUpperCase();
}

function labelFor(item) {
  return (
    item.name ||
    item.teacher_name ||
    item.title ||
    item.subject ||
    item.class_name ||
    [item.class, item.section].filter(Boolean).join("-") ||
    [item.grade, item.section].filter(Boolean).join("-") ||
    item.roll_number ||
    "Untitled"
  );
}

function detailFor(item, type) {
  if (type === "Student") {
    return [item.roll_number && `Roll ${item.roll_number}`, item.class, item.section]
      .filter(Boolean)
      .join(" | ");
  }
  if (type === "Teacher") return item.subject || item.teacher_type || item.email || "";
  if (type === "Class") return [item.grade || item.class, item.section, item.subject].filter(Boolean).join(" | ");
  return item.exam_name || item.exam_type || item.status || "";
}

export default function PortalTopbar({ role = "admin", onRefresh, className = "" }) {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [searchItems, setSearchItems] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const rootRef = useRef(null);

  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setSearchOpen(false);
        setProfileOpen(false);
        setNoticeOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSearch() {
      if (!query.trim()) {
        setSearchItems([]);
        return;
      }
      setLoadingSearch(true);
      try {
        const settled = await Promise.allSettled(
          cfg.searchSources.map((source) => apiFetch(source.path)),
        );
        if (cancelled) return;
        const needle = query.toLowerCase();
        const items = settled.flatMap((result, index) => {
          if (result.status !== "fulfilled") return [];
          const source = cfg.searchSources[index];
          const rows = Array.isArray(result.value) ? result.value : result.value?.data || [];
          return rows
            .map((row) => ({
              ...row,
              _type: source.type,
              _href: source.href,
              _label: labelFor(row),
              _detail: detailFor(row, source.type),
            }))
            .filter((row) => `${row._label} ${row._detail}`.toLowerCase().includes(needle))
            .slice(0, 5);
        });
        setSearchItems(items.slice(0, 10));
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }
    const timer = setTimeout(loadSearch, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cfg.searchSources, query]);

  async function loadNotices() {
    setLoadingNotices(true);
    try {
      const data = await apiFetch(cfg.noticePath);
      setNotices(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {
      setNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  }

  const unreadCount = notices.length;
  const name = user?.name || (role === "admin" ? "Admin User" : role);

  return (
    <header
      ref={rootRef}
      className={`sticky top-0 z-30 bg-orange-50/90 backdrop-blur border-b border-orange-100 flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm ${className}`}
    >
      <div className="relative w-72 max-w-full ml-10 lg:ml-0">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder={
            role === "admin"
              ? "Search students, classes..."
              : role === "teacher"
                ? "Search students, classes..."
                : "Search teachers, results..."
          }
          className="w-full rounded-2xl border border-orange-100 bg-white/70 py-3 pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSearchItems([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}

        {searchOpen && query.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl">
            {loadingSearch ? (
              <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
            ) : searchItems.length ? (
              searchItems.map((item, index) => (
                <Link
                  key={`${item._type}-${item.id || index}`}
                  href={item._href}
                  onClick={() => setSearchOpen(false)}
                  className="block border-b border-slate-50 px-4 py-3 hover:bg-orange-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-slate-800">{item._label}</p>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                      {item._type}
                    </span>
                  </div>
                  {item._detail && <p className="mt-0.5 truncate text-xs text-slate-500">{item._detail}</p>}
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500">No matches found</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-orange-600"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setNoticeOpen((open) => !open);
              setProfileOpen(false);
              if (!noticeOpen) loadNotices();
            }}
            className="relative rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-orange-600"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-orange-50" />
            )}
          </button>
          {noticeOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-orange-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                <Link href={role === "admin" ? "/admin/notices" : `/${role}s/notices`} className="text-xs font-semibold text-orange-600">
                  View all
                </Link>
              </div>
              {loadingNotices ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading notices...</div>
              ) : notices.length ? (
                <div className="max-h-80 overflow-y-auto">
                  {notices.map((notice) => (
                    <div key={notice.id} className="border-b border-slate-50 px-4 py-3">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-800">{notice.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{notice.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">No notifications yet</div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((open) => !open);
              setNoticeOpen(false);
            }}
            className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white">
              {initials(name)}
            </div>
            <span className="hidden text-sm font-semibold text-slate-700 sm:block">{name}</span>
            <ChevronDown size={15} className="text-slate-400" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl">
              <div className="border-b border-orange-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">{name}</p>
                <p className="text-xs capitalize text-slate-500">{role} portal</p>
              </div>
              <Link href={cfg.profileHref} className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-orange-50">
                <User size={16} /> Profile
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
