"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  UserCog,
  School,
  CalendarCheck,
  FileText,
  BarChart3,
  ClipboardList,
  CreditCard,
  Wallet,
  CalendarDays,
  BookOpen,
  Bus,
  Hotel,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  GraduationCap,
  X,
  Fingerprint,
  Banknote,
} from "lucide-react";
import SidebarItem from "./SidebarItem";

const NAV_SECTIONS = [
  {
    heading: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/" },
      { icon: Users, label: "Students", href: "/students" },
      { icon: UserCog, label: "Teachers", href: "/teachers" },
      { icon: School, label: "Classes", href: "/classes" },
    ],
  },
  {
    heading: "Academic",
    items: [
      { icon: BarChart3, label: "Results", href: "/results" },
      { icon: CalendarDays, label: "Examinations", href: "/examinations" },
      { icon: FileText, label: "Documents", href: "/documents" },
      { icon: ClipboardList, label: "Notices", href: "/admin/notices" },
      { icon: CalendarCheck, label: "Holidays", href: "/holidays" },
    ],
  },

  {
    heading: "Finance",
    items: [
      { icon: CreditCard, label: "Fees", href: "/fees" },
      { icon: Wallet, label: "College Finance", href: "/finance" },
      { icon: Banknote, label: "Payroll", href: "/payroll" },
    ],
  },
  {
    heading: "Management",
    items: [
      { icon: CalendarDays, label: "Timetable", href: "/timetable" },
      { icon: Bus, label: "Transport", href: "/transport" },
      { icon: Hotel, label: "Hostel", href: "/hostel" },
      { icon: BookOpen, label: "Library", href: "/library" },
      {
        icon: Fingerprint,
        label: "Smart Attendance",
        href: "/smart-attendance",
      },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token"); // remove JWT

    // clear cookie (if you are using it)
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

    window.location.href = "/login"; // redirect
  };

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          fixed top-4 left-4 z-40 lg:hidden
          p-2.5 bg-blue-600 text-white rounded-xl
          shadow-lg shadow-blue-900/30
          hover:bg-blue-700 active:scale-95
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        "
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden
                     animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* ══════════════════════════════════════
          SIDEBAR PANEL
      ══════════════════════════════════════ */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-gradient-to-b from-blue-500 to-blue-700
          shadow-2xl shadow-blue-900/40
          transition-all duration-300 ease-in-out

          /* Mobile: slide in/out */
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

          /* Desktop width toggle */
          ${collapsed ? "lg:w-[72px]" : "lg:w-64"}

          /* Mobile always full-width sidebar */
          w-72
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* ── Logo / Header ── */}
        <div
          className={`
          relative flex items-center px-4 py-5 border-b border-white/10
          ${collapsed ? "justify-center lg:px-2" : "justify-between"}
        `}
        >
          <div
            className={`flex items-center gap-3 ${collapsed ? "lg:gap-0" : ""}`}
          >
            <div
              className="flex-shrink-0 w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center
                            ring-1 ring-white/30 shadow-inner"
            >
              <GraduationCap size={20} className="text-white" />
            </div>
            {!collapsed && (
              <div className="lg:block">
                <p className="text-white font-bold text-base leading-tight tracking-tight">
                  EduERP
                </p>
                <p className="text-blue-200 text-[10px] font-medium uppercase tracking-widest">
                  School Management
                </p>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={closeMobile}
            className="lg:hidden text-blue-200 hover:text-white p-1 rounded-lg
                       hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>

          {/* Desktop collapse toggle */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex items-center justify-center w-7 h-7
                         rounded-lg text-blue-200 hover:text-white hover:bg-white/15
                         transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* ── Nav sections (scrollable) ── */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3
                        scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20
                        space-y-1"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className="mb-2">
              {/* Section heading */}
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-blue-300/80 select-none">
                  {section.heading}
                </p>
              )}
              {collapsed && <div className="my-2 border-t border-white/10" />}

              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    {...item}
                    collapsed={collapsed}
                    onClick={closeMobile}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer: Expand + Logout ── */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          {/* Expand button (desktop only, shown when collapsed) */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:flex w-full items-center justify-center p-2.5 rounded-xl
                         text-blue-200 hover:text-white hover:bg-white/15 hover:scale-[1.02]
                         transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Expand sidebar"
            >
              <ChevronLeft size={18} className="rotate-180" />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`
              group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
              text-blue-100 hover:bg-red-500/25 hover:text-red-200
              transition-all duration-200 hover:scale-[1.02]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
              ${collapsed ? "justify-center" : ""}
            `}
            aria-label="Logout"
          >
            <LogOut
              size={18}
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
            />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Spacer so main content shifts right (desktop only) ── */}
      <div
        className={`
        hidden lg:block flex-shrink-0 transition-all duration-300
        ${collapsed ? "w-[72px]" : "w-64"}
      `}
      />
    </>
  );
}
