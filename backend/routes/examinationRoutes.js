const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requestValidation } = require("../middleware/requestValidation");
const controller = require("../controllers/examinationController");

const uploadDir = path.join(__dirname, "../uploads/question-papers");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) =>
      callback(
        null,
        `question_${Date.now()}_${Math.random().toString(36).slice(2)}${path
          .extname(file.originalname)
          .toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    callback(
      allowed.includes(file.mimetype)
        ? null
        : new Error("Only PDF, JPG, and PNG files are allowed"),
      allowed.includes(file.mimetype),
    );
  },
});

const router = express.Router();
router.get(
  "/student",
  protect,
  authorizeRoles("student"),
  controller.getStudentExaminations,
);
router.use(protect, authorizeRoles("admin"));
router.get("/", controller.getExaminationAdmin);
router.post("/schedule", controller.saveSchedule);
router.put("/schedule/:id", controller.saveSchedule);
router.delete("/schedule/:id", controller.deleteSchedule);
router.post(
  "/question-papers",
  upload.single("file"),
  requestValidation,
  controller.uploadQuestionPaper,
);
router.put("/question-papers/:id", controller.updateQuestionPaper);
router.delete("/question-papers/:id", controller.deleteQuestionPaper);
router.post("/admit-cards/:examId/generate", controller.generateAdmitCards);
router.put("/admit-cards/:examId/publish", controller.publishAdmitCards);
router.get("/admit-cards/:examId", controller.getAdmitCards);

module.exports = router;
