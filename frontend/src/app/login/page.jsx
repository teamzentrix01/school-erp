"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Shield,
  BookOpen,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Users,
  BarChart3,
  Lock,
  Mail,
  Key,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

// Imports ke baad, ROLES array se pehle — file ke top mein add karo:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    icon: Shield,
    color: "from-blue-600 to-blue-700",
    ring: "ring-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-600",
    accent: "#2563eb",
    badge: "Full Access",
  },
  {
    key: "teacher",
    label: "Teacher",
    icon: BookOpen,
    color: "from-emerald-600 to-teal-700",
    ring: "ring-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    accent: "#059669",
    badge: "Academic Access",
  },
  {
    key: "student",
    label: "Student",
    icon: GraduationCap,
    color: "from-violet-600 to-purple-700",
    ring: "ring-violet-500",
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
    accent: "#7c3aed",
    badge: "Student Portal",
  },
];

const FEATURES = [
  { icon: Users, label: "Student Management" },
  { icon: BarChart3, label: "Analytics & Reports" },
  { icon: Lock, label: "Secure & Encrypted" },
  { icon: Sparkles, label: "AI-Powered Insights" },
];

function Blobs({ accent }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ background: accent }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse"
        style={{ background: accent, animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl animate-pulse"
        style={{ background: accent, animationDelay: "2s" }}
      />
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// Forgot Password Modal Component
function ForgotPasswordModal({ isOpen, onClose, activeRole, onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP, 3: reset password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: activeRole.key }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send OTP");
        setLoading(false);
        return;
      }

      setSuccess("OTP sent to your email! Please check your inbox.");
      setCountdown(60); // 60 seconds cooldown
      setStep(2);
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid OTP");
        setLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setSuccess("OTP verified! Now you can reset your password.");
      setStep(3);
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(
        "Password reset successfully! You can now login with your new password.",
      );
      setTimeout(() => {
        onBackToLogin();
        onClose();
      }, 2000);
    } catch (err) {
      setError("Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: activeRole.key }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to resend OTP");
        setLoading(false);
        return;
      }

      setSuccess("OTP resent successfully!");
      setCountdown(60);
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in duration-300">
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, ${activeRole.accent}, ${activeRole.accent}88)`,
          }}
        />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: activeRole.accent }}
              >
                <Key size={16} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Reset Password
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step >= s ? "text-white" : "bg-slate-200 text-slate-500"
                  }`}
                  style={step >= s ? { background: activeRole.accent } : {}}
                >
                  {step > s ? <CheckCircle size={18} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      step > s ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Request OTP */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none bg-slate-50 focus:bg-white transition-all"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 3px ${activeRole.accent}22`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  We&apos;ll send a 6-digit OTP to your email
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <CheckCircle size={14} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                style={{
                  background: `linear-gradient(135deg, ${activeRole.accent}, ${activeRole.accent}cc)`,
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest text-lg font-mono focus:outline-none bg-slate-50 focus:bg-white transition-all"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = `0 0 0 3px ${activeRole.accent}22`)
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                  required
                />
                <p className="text-xs text-slate-400 mt-1 text-center">
                  Enter the OTP sent to {email}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <CheckCircle size={14} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                style={{
                  background: `linear-gradient(135deg, ${activeRole.accent}, ${activeRole.accent}cc)`,
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={countdown > 0}
                  className="text-xs font-medium hover:underline transition-all disabled:opacity-50"
                  style={{ color: activeRole.accent }}
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Back to email
              </button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none bg-slate-50 focus:bg-white transition-all"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 3px ${activeRole.accent}22`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none bg-slate-50 focus:bg-white transition-all"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 3px ${activeRole.accent}22`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <CheckCircle size={14} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                style={{
                  background: `linear-gradient(135deg, ${activeRole.accent}, ${activeRole.accent}cc)`,
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const active = ROLES.find((r) => r.key === role);
  const Icon = active.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Check your credentials.");
        setLoading(false);
        return;
      }

      // Store token + user in cookies (accessible by middleware)
      const expires = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toUTCString();
      document.cookie = `token=${data.token}; expires=${expires}; path=/`;
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data.user))}; expires=${expires}; path=/`;

      // Redirect based on role
      // Role-based redirect
      const userRole = data.user?.role || role;
      if (userRole === "student") {
        window.location.href = "/students/dashboard";
      } else if (userRole === "teacher") {
        window.location.href = "/teachers/dashboard";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError(
        "Cannot connect to server. Make sure backend is running on port 5000.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex font-sans bg-slate-950">
        {/* Left Panel */}
        <div
          className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden transition-all duration-700"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          }}
        >
          <Blobs accent={active.accent} />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500"
              style={{ background: active.accent }}
            >
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none tracking-tight">
                EduERP
              </p>
              <p className="text-slate-400 text-xs">School Management System</p>
            </div>
          </div>

          {/* Center */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500"
              style={{
                background: `${active.accent}22`,
                border: `1.5px solid ${active.accent}44`,
              }}
            >
              <Icon
                size={52}
                style={{ color: active.accent }}
                strokeWidth={1.5}
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
              Welcome back,
              <br />
              <span style={{ color: active.accent }}>{active.label}</span>
            </h1>
            <p className="text-slate-400 text-base max-w-xs leading-relaxed">
              Sign in to access your personalised EduERP dashboard and manage
              your school seamlessly.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-10 w-full max-w-sm">
              {FEATURES.map(({ icon: FIcon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left"
                >
                  <FIcon size={15} style={{ color: active.accent }} />
                  <span className="text-slate-300 text-xs font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-slate-500 text-xs">
            © 2025 EduERP · Built for modern schools
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center p-6 bg-white relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1 transition-all duration-500"
            style={{
              background: `linear-gradient(90deg, ${active.accent}, ${active.accent}88)`,
            }}
          />

          <div className="w-full max-w-[420px] space-y-7">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: active.accent }}
              >
                <GraduationCap size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-none">EduERP</p>
                <p className="text-slate-400 text-xs">School Management</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Choose your role and enter your credentials
              </p>
            </div>

            {/* Role Switcher */}
            <div className="bg-slate-100 rounded-2xl p-1.5 flex gap-1">
              {ROLES.map((r) => {
                const RIcon = r.icon;
                const isActive = role === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => {
                      setRole(r.key);
                      setError("");
                    }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-300 ${isActive ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <RIcon
                      size={16}
                      style={isActive ? { color: r.accent } : {}}
                    />
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Role badge */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${active.bg} transition-all duration-300`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active.dot}`} />
              <span className={`text-xs font-semibold ${active.text}`}>
                {active.badge}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-slate-50 focus:bg-white placeholder:text-slate-300 transition-all"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = `0 0 0 3px ${active.accent}22`)
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium hover:underline transition-all"
                    style={{ color: active.accent }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none bg-slate-50 focus:bg-white placeholder:text-slate-300 transition-all"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 3px ${active.accent}22`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="rounded"
                  style={{ accentColor: active.accent }}
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-slate-500 cursor-pointer"
                >
                  Keep me signed in
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100"
                style={{
                  background: `linear-gradient(135deg, ${active.accent}, ${active.accent}cc)`,
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    {" "}
                    Sign In as {active.label} <ArrowRight size={16} />{" "}
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400">
              Protected by EduERP Security ·{" "}
              <span className="font-medium text-slate-500">v2.5.0</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        activeRole={active}
        onBackToLogin={() => {
          setEmail("");
          setPassword("");
        }}
      />
    </>
  );
}
