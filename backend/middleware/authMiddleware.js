const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

// Protects routes by verifying JWT token
// const protect = (req, res, next) => {

//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "No token provided, authorization denied" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // { id, email, role, name }
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Token is invalid or expired" });
//   }
// };
const protect = async (req, res, next) => {
  // Header se try karo
  let token = null;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Cookie se try karo (fallback)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await pool.query(
      "SELECT id,name,email,role FROM users WHERE id=$1 AND is_active=TRUE",
      [decoded.id],
    );
    if (!user.rows.length) {
      return res.status(401).json({ message: "User is inactive or not found" });
    }
    req.user = user.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

// Restricts access to specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
