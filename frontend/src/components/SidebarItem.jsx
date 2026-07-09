"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarItem({ icon: Icon, label, href, collapsed, onClick }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const handleClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    onClick?.();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      title={collapsed ? label : undefined}
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 ease-in-out relative
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70
        ${collapsed ? "justify-center" : ""}
        ${
          isActive
            ? "bg-white text-blue-600 shadow-md shadow-blue-900/20 font-semibold"
            : "text-blue-100 hover:bg-white/15 hover:text-white hover:scale-[1.02]"
        }
      `}
    >
      <Icon
        size={18}
        className={`shrink-0 transition-transform duration-200 ${
          isActive ? "text-blue-600" : "text-blue-200 group-hover:text-white"
        }`}
      />

      {!collapsed && (
        <span className="text-sm leading-none tracking-wide">{label}</span>
      )}

      {/* Active pill indicator */}
      {isActive && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <div className="
          absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white
          text-xs rounded-lg opacity-0 pointer-events-none
          group-hover:opacity-100 transition-opacity duration-200
          whitespace-nowrap z-50 shadow-xl
        ">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      )}
    </Link>
  );
}
