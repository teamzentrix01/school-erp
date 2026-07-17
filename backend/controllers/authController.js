const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const crypto = require("crypto");
const { sendOTPEmail } = require("../services/emailService");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );
};
const otpStore = new Map();
// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ message: "Email, password and role are required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND role = $2 AND is_active = true",
      [email, role],
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid credentials or role mismatch" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    // Get role-specific profile
    let profile = null;
    if (role === "student") {
      const s = await pool.query("SELECT * FROM students WHERE user_id = $1", [
        user.id,
      ]);
      profile = s.rows[0] || null;
    } else if (role === "teacher") {
      const t = await pool.query("SELECT * FROM teachers WHERE user_id = $1", [
        user.id,
      ]);
      profile = t.rows[0] || null;
    }

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      profile,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/register  (Admin only — to create teachers/students)
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const validRoles = ["admin", "teacher", "student", "accounts"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, hashed, role],
    );

    res
      .status(201)
      .json({ message: "User created successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/forgot-password
// Store OTPs temporarily (in production, use Redis)

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: "Email and role are required" });
  }

  try {
    // Check if user exists
    const result = await pool.query(
      "SELECT id, email, role FROM users WHERE email = $1 AND role = $2 AND is_active = true",
      [email, role],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No account found with these credentials" });
    }

    const user = result.rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email, { otp, expiresAt, userId: user.id });

    // Send email using your existing emailService
    const { sendOTPEmail } = require("../services/emailService");
    await sendOTPEmail(email, otp);

    res.json({
      message: "OTP sent to your email",
      email: email,
      expiresIn: 600, // 10 minutes in seconds
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const storedData = otpStore.get(email);

    if (!storedData) {
      return res
        .status(400)
        .json({ message: "OTP expired or not found. Request a new one." });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res
        .status(400)
        .json({ message: "OTP has expired. Request a new one." });
    }

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { userId: storedData.userId, email: email, purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.json({
      message: "OTP verified successfully",
      resetToken: resetToken,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res
      .status(400)
      .json({ message: "Reset token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.query(
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, decoded.userId],
    );

    // Clear OTP from store
    otpStore.delete(decoded.email);

    res.json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    if (err.name === "JsonWebTokenError") {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Update module.exports

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [req.user.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  login,
  register,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
