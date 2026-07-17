const pool = require("../config/db");

const financialAudit = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const originalJson = res.json.bind(res);
  let logged = false;
  res.json = (body) => {
    if (
      logged ||
      !req.user ||
      !["admin", "accounts"].includes(req.user.role) ||
      res.statusCode < 200 ||
      res.statusCode >= 400
    ) {
      return originalJson(body);
    }
    logged = true;
    return pool
      .query(
        `INSERT INTO financial_audit_logs
           (user_id,user_role,method,path,status_code,details)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          req.user.id,
          req.user.role,
          req.method,
          req.originalUrl.split("?")[0],
          res.statusCode,
          JSON.stringify({ params: req.params, query: req.query }),
        ],
      )
      .then(() => originalJson(body))
      .catch((error) => {
        console.error("financialAudit:", error.message);
        if (!res.headersSent) {
          return res.status(500).json({ message: "Financial audit logging failed" });
        }
        return undefined;
      });
  };
  next();
};

module.exports = financialAudit;
