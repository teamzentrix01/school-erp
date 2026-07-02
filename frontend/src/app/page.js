"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { apiFetch, getUser, logout } from "@/lib/api";
import {
  Users,
  TrendingUp,
  BookOpen,
  CalendarCheck,
  Bell,
  Search,
  ChevronDown,
  GraduationCap,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  UserPlus,
  CreditCard,
  ClipboardList,
  Megaphone,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function fmtCurrency(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trend >= 0
                ? "text-green-600 bg-green-50"
                : "text-red-500 bg-red-50"
            }`}
          >
            {trend >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Alert Panel ─────────────────────────────────────────────────────────────
function AlertPanel({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  const iconMap = {
    warning: {
      icon: AlertTriangle,
      color: "text-amber-500 bg-amber-50 border-amber-200",
    },
    error: {
      icon: AlertTriangle,
      color: "text-red-500 bg-red-50 border-red-200",
    },
    info: { icon: Info, color: "text-blue-500 bg-blue-50 border-blue-200" },
    success: {
      icon: CheckCircle2,
      color: "text-green-500 bg-green-50 border-green-200",
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bell size={16} className="text-amber-500" /> Alerts & Notifications
        </h2>
        <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {alerts.map((a, i) => {
          const cfg = iconMap[a.type] || iconMap.info;
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 px-5 py-3.5 border-l-4 ${cfg.color}`}
            >
              <Icon size={16} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{a.message}</p>
                {a.sub && (
                  <p className="text-xs text-gray-400 mt-0.5">{a.sub}</p>
                )}
              </div>
              {a.count && (
                <span className="flex-shrink-0 text-xs font-bold bg-white border border-current rounded-full px-2 py-0.5">
                  {a.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
const ACT_ICON = {
  admission: { icon: UserPlus, bg: "bg-blue-100", text: "text-blue-600" },
  fee: { icon: CreditCard, bg: "bg-green-100", text: "text-green-600" },
  attendance: {
    icon: CalendarCheck,
    bg: "bg-violet-100",
    text: "text-violet-600",
  },
  notice: { icon: Megaphone, bg: "bg-amber-100", text: "text-amber-600" },
  default: { icon: Info, bg: "bg-gray-100", text: "text-gray-500" },
};

function ActivityFeed({ activities }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        <span className="text-xs text-gray-400">Live</span>
      </div>
      {!activities || activities.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          No recent activity
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {activities.map((a, i) => {
            const cfg = ACT_ICON[a.type] || ACT_ICON.default;
            const Icon = cfg.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                >
                  <Icon size={15} className={cfg.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {a.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {prefix}
          {typeof p.value === "number"
            ? p.value.toLocaleString("en-IN")
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── PIE label ────────────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return value > 0 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {value}
    </text>
  ) : null;
}

// ─── PIE Colors ───────────────────────────────────────────────────────────────
const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attRange, setAttRange] = useState(7); // 7 or 30
  const [user, setUser] = useState(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setUser(getUser());
    setGreeting(getGreeting());
    setTodayLabel(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashData, studentsData, feeStats, attTrend] =
        await Promise.allSettled([
          apiFetch("/admin/dashboard"),
          apiFetch("/admin/students"),
          apiFetch("/fees/stats"),
          apiFetch(`/admin/attendance/trend?days=${attRange}`),
        ]);

      const dash = dashData.status === "fulfilled" ? dashData.value : null;
      const students =
        studentsData.status === "fulfilled" ? studentsData.value : [];
      const fees = feeStats.status === "fulfilled" ? feeStats.value : null;
      const att = attTrend.status === "fulfilled" ? attTrend.value : null;

      setStats(dash);

      // ── Build alerts ────────────────────────────────────────────────────────
      const builtAlerts = [];
      if (fees?.data?.summary) {
        const s = fees.data.summary;
        if (Number(s.overdue_count) > 0)
          builtAlerts.push({
            type: "error",
            message: `${s.overdue_count} students have overdue fees`,
            sub: "Immediate action required",
            count: s.overdue_count,
          });
        if (Number(s.pending_count) > 0)
          builtAlerts.push({
            type: "warning",
            message: `${s.pending_count} students have pending fees`,
            sub: "Follow up recommended",
            count: s.pending_count,
          });
      }
      if (dash?.lowAttendanceCount > 0)
        builtAlerts.push({
          type: "warning",
          message: `${dash.lowAttendanceCount} students below 75% attendance`,
          sub: "Review required",
          count: dash.lowAttendanceCount,
        });
      if (dash?.upcomingHolidays?.length > 0)
        builtAlerts.push({
          type: "info",
          message: `Upcoming: ${dash.upcomingHolidays[0].title}`,
          sub: new Date(dash.upcomingHolidays[0].date).toLocaleDateString(
            "en-IN",
            { day: "2-digit", month: "short" },
          ),
        });
      if (dash?.newAdmissionsToday > 0)
        builtAlerts.push({
          type: "success",
          message: `${dash.newAdmissionsToday} new admissions today`,
          sub: "Welcome new students!",
        });
      setAlerts(builtAlerts);

      // ── Build activity feed ─────────────────────────────────────────────────
      const recentStudents = (Array.isArray(students) ? students : [])
        .slice(0, 3)
        .map((s) => ({
          type: "admission",
          message: `New student admitted: ${s.name}`,
          time: new Date(s.created_at || Date.now()).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            },
          ),
        }));
      const feeActivity = fees?.data?.summary
        ? [
            {
              type: "fee",
              message: `₹${Number(fees.data.summary.total_collected || 0).toLocaleString("en-IN")} collected this year`,
              time: "Fee overview",
            },
          ]
        : [];
      const noticeActivity = dash?.recentNotice
        ? [
            {
              type: "notice",
              message: `Notice: ${dash.recentNotice.title}`,
              time: new Date(dash.recentNotice.created_at).toLocaleDateString(
                "en-IN",
              ),
            },
          ]
        : [];
      setActivities([...recentStudents, ...feeActivity, ...noticeActivity]);

      // ── Build chart data ─────────────────────────────────────────────────────
      const monthly = fees?.data?.monthly || fees?.monthly || [];
      console.log("fees:", fees, "monthly:", monthly);
      const feeBar = monthly.map((m) => ({
        month: m.month,
        Collected: Number(m.collected),
      }));

      // Class-wise pie
      const classMap = {};
      (Array.isArray(students) ? students : []).forEach((s) => {
        const key = s.class ? `Class ${s.class}` : "Unknown";
        classMap[key] = (classMap[key] || 0) + 1;
      });
      const classPie = Object.entries(classMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
          const na = parseInt(a.name.replace("Class ", "")) || 0;
          const nb = parseInt(b.name.replace("Class ", "")) || 0;
          return na - nb;
        });

      // Attendance trend
      const attLine = att?.data || att || [];

      // Fee status pie
      const feeSummary = fees?.data?.summary;
      const feePie = feeSummary
        ? [
            { name: "Paid", value: Number(feeSummary.paid_count || 0) },
            { name: "Pending", value: Number(feeSummary.pending_count || 0) },
            { name: "Partial", value: Number(feeSummary.partial_count || 0) },
            { name: "Overdue", value: Number(feeSummary.overdue_count || 0) },
          ].filter((d) => d.value > 0)
        : [];

      setChartData({ feeBar, classPie, attLine, feePie, feeSummary });
    } catch (err) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [attRange]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Stat cards config ────────────────────────────────────────────────────────
  const STAT_CARDS = stats
    ? [
        {
          icon: Users,
          label: "Total Students",
          value: stats.totalStudents?.toLocaleString(),
          color: "bg-blue-50 text-blue-600",
          trend: stats.studentGrowth,
        },
        {
          icon: GraduationCap,
          label: "Total Teachers",
          value: stats.totalTeachers?.toLocaleString(),
          color: "bg-violet-50 text-violet-600",
          trend: undefined,
        },
        {
          icon: BookOpen,
          label: "Total Classes",
          value: stats.totalClasses?.toLocaleString(),
          color: "bg-emerald-50 text-emerald-600",
          trend: undefined,
        },
        {
          icon: TrendingUp,
          label: "Fee Collected",
          value: fmtCurrency(Number(stats.monthlyRevenue || 0)),
          color: "bg-amber-50 text-amber-600",
          sub: "This month",
          trend: stats.revenueGrowth,
        },
      ]
    : [];

  return (
    <div className="portal-saffron flex min-h-screen bg-orange-50/45 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-orange-50/90 backdrop-blur border-b border-orange-100 flex items-center justify-between gap-4 px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-64 max-w-full ml-10 lg:ml-0">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search students, classes…"
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAll}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
              )}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(user?.name || "Admin")}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.name || "Admin"}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 space-y-6">
          {/* Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {greeting}, {user?.name?.split(" ")[0] || "Admin"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Here&apos;s your school at a glance today.
              </p>
            </div>
            <p className="text-sm text-gray-400 hidden sm:block">
              {todayLabel}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* ── Stat Cards ── */}
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse h-28"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STAT_CARDS.map((s, i) => (
                <StatCard key={i} {...s} />
              ))}
            </div>
          )}

          {/* ── Alerts ── */}
          {!loading && alerts.length > 0 && <AlertPanel alerts={alerts} />}

          {/* ── Charts Row 1: Attendance + Fee Bar ── */}
          {!loading && chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Attendance Trend Line Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">
                    Attendance Trend
                  </h2>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {[7, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => setAttRange(d)}
                        className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                          attRange === d
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                {chartData.attLine?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={chartData.attLine}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        domain={[0, 100]}
                        unit="%"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Attendance %"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    No attendance data available
                  </div>
                )}
              </div>

              {/* Fee Collection Bar Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">
                    Fee Collection
                  </h2>
                  <span className="text-xs text-gray-400">Last 6 months</span>
                </div>
                {chartData.feeBar?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={chartData.feeBar}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickFormatter={(v) => fmtCurrency(v)}
                      />
                      <Tooltip content={<CustomTooltip prefix="₹" />} />
                      <Bar
                        dataKey="Collected"
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    No fee data available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Charts Row 2: Class Pie + Fee Status Pie ── */}
          {!loading && chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Class-wise Students Pie */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Students per Class
                </h2>
                {chartData.classPie?.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData.classPie}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          labelLine={false}
                          label={PieLabel}
                        >
                          {chartData.classPie.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 overflow-auto max-h-[200px]">
                      {chartData.classPie.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-xs text-gray-600 truncate flex-1">
                            {d.name}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                    No data
                  </div>
                )}
              </div>

              {/* Fee Status Pie */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Fee Status Distribution
                </h2>
                {chartData.feePie?.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData.feePie}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          labelLine={false}
                          label={PieLabel}
                        >
                          {chartData.feePie.map((d) => {
                            const colorMap = {
                              Paid: "#10b981",
                              Pending: "#f59e0b",
                              Partial: "#6366f1",
                              Overdue: "#ef4444",
                            };
                            return (
                              <Cell
                                key={d.name}
                                fill={colorMap[d.name] || "#6366f1"}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {chartData.feePie.map((d) => {
                        const colorMap = {
                          Paid: "#10b981",
                          Pending: "#f59e0b",
                          Partial: "#6366f1",
                          Overdue: "#ef4444",
                        };
                        return (
                          <div key={d.name} className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: colorMap[d.name] }}
                            />
                            <span className="text-xs text-gray-600 flex-1">
                              {d.name}
                            </span>
                            <span className="text-xs font-bold text-gray-800">
                              {d.value}
                            </span>
                          </div>
                        );
                      })}
                      {chartData.feeSummary && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            Total collected
                          </p>
                          <p className="text-base font-bold text-emerald-600">
                            ₹
                            {Number(
                              chartData.feeSummary.total_collected || 0,
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                    No data
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Activity Feed ── */}
          {!loading && <ActivityFeed activities={activities} />}
        </div>
      </main>
    </div>
  );
}
