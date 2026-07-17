const cookieParser = require("cookie-parser");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const initDatabase = require("./config/initDatabase");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const feesRoutes = require("./routes/feesRoutes");
const adminNoticesRoutes = require("./routes/admin/notices");
const studentNoticesRoutes = require("./routes/student/notices");
const teacherNoticesRoutes = require("./routes/teacher/notices");
const homeworkRoutes = require("./routes/homeworkRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const transportRoutes = require("./routes/transportRoutes");
const resultsRoutes = require("./routes/resultsRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const libraryRoutes = require("./routes/libraryRoutes");
const documentRoutes = require("./routes/documentRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const financeRoutes = require("./routes/financeRoutes");
const examinationRoutes = require("./routes/examinationRoutes");
const smartAttendanceRoutes = require("./routes/smartAttendanceRoutes");
const accountsRoutes = require("./routes/accountsRoutes");
const { requestValidation } = require("./middleware/requestValidation");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(requestValidation);
app.get("/", (req, res) => res.json({ message: "EduERP API running" }));

app.use("/api/admin/notices", adminNoticesRoutes);
app.use("/api/student/notices", studentNoticesRoutes);
app.use("/api/teacher/notices", teacherNoticesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin/payroll", payrollRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", timetableRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/admin/transport", transportRoutes);
app.use("/api/admin/results", resultsRoutes);
app.use("/api/admin/hostel", hostelRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/examinations", examinationRoutes);
app.use("/api/smart-attendance", smartAttendanceRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;

async function startServer(port = PORT) {
  await initDatabase();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
