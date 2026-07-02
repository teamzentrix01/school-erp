// app/students/homework/page.jsx
"use client";

import StudentSidebar from "@/components/StudentSidebar";
import StudentHomeworkList from "@/components/StudentHomeworkList";
import { BookOpen } from "lucide-react";

export default function StudentHomeworkPage() {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="portal-saffron flex min-h-screen bg-gray-50">
      <StudentSidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="pl-10 lg:pl-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Homework</h1>
              <p className="text-sm text-gray-400">{today}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl">
            <StudentHomeworkList />
          </div>
        </div>
      </main>
    </div>
  );
}
