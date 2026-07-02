const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getLibrary,
  saveBook,
  deleteBook,
  issueBook,
  returnBook,
  getStudentLibrary,
} = require("../controllers/libraryController");

const router = express.Router();

router.get("/student", protect, authorizeRoles("student"), getStudentLibrary);
router.use(protect, authorizeRoles("admin"));
router.get("/", getLibrary);
router.post("/books", saveBook);
router.put("/books/:id", saveBook);
router.delete("/books/:id", deleteBook);
router.post("/issues", issueBook);
router.post("/issues/:id/return", returnBook);

module.exports = router;
