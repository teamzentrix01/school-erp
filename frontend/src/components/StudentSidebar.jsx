"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Users,
  LogOut,
  X,
  Menu,
  ChevronLeft,
  Bell,
  CreditCard,
  BookOpen,
  BarChart3,
  ClipboardList,
  Library,
  Fingerprint,
  Building2,
} from "lucide-react";
import SidebarItem from "@/components/SidebarItem";

const STUDENT_NAV = [
  {
    heading: "My Portal",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/students/dashboard",
      },
      { icon: GraduationCap, label: "My Profile", href: "/students/profile" },
      { icon: CalendarDays, label: "Timetable", href: "/students/timetable" },
      { icon: BookOpen, label: "Homework", href: "/students/homework" }, // ✅ NEW
      { icon: BarChart3, label: "My Results", href: "/students/results" },
      {
        icon: ClipboardList,
        label: "Examinations",
        href: "/students/examinations",
      },
      { icon: Library, label: "My Library", href: "/students/library" },
      {
        icon: Fingerprint,
        label: "QR Attendance",
        href: "/students/attendance",
      },
      {
        icon: Building2,
        label: "Campus Services",
        href: "/students/services",
      },
      { icon: Users, label: "My Teachers", href: "/students/teachers" },
      { icon: Bell, label: "Notices", href: "/students/notices" },
      { icon: CreditCard, label: "My Fees", href: "/students/fees" },
    ],
  },
];

export default function StudentSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "user=;  path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2.5 bg-violet-600 text-white rounded-xl shadow-lg shadow-violet-900/30 hover:bg-violet-700 active:scale-95 transition-all"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-gradient-to-b from-violet-600 to-purple-800
          shadow-2xl shadow-purple-900/40
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-[72px]" : "lg:w-64"}
          w-72
        `}
        role="navigation"
        aria-label="Student navigation"
      >
        <div
          className={`relative flex items-center px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center lg:px-2" : "justify-between"}`}
        >
          <div
            className={`flex items-center gap-3 ${collapsed ? "lg:gap-0" : ""}`}
          >
            <div className="flex-shrink-0 w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center ring-1 ring-white/30 shadow-inner">
              <GraduationCap size={20} className="text-white" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-white font-bold text-base leading-tight tracking-tight">
                  Student Portal
                </p>
                <p className="text-violet-200 text-[10px] font-medium uppercase tracking-widest">
                  EduERP
                </p>
              </div>
            )}
          </div>
          <button
            onClick={closeMobile}
            className="lg:hidden text-violet-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-violet-200 hover:text-white hover:bg-white/15 transition-all"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {STUDENT_NAV.map((section) => (
            <div key={section.heading} className="mb-2">
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-violet-300/80 select-none">
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

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:flex w-full items-center justify-center p-2.5 rounded-xl text-violet-200 hover:text-white hover:bg-white/15 transition-all"
              aria-label="Expand sidebar"
            >
              <ChevronLeft size={18} className="rotate-180" />
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-violet-100 hover:bg-red-500/25 hover:text-red-200 transition-all ${collapsed ? "justify-center" : ""}`}
            aria-label="Logout"
          >
            <LogOut
              size={18}
              className="shrink-0 transition-transform group-hover:translate-x-0.5"
            />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${collapsed ? "w-[72px]" : "w-64"}`}
      />
    </>
  );
}
