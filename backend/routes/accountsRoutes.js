const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const controller = require("../controllers/accountsController");

const router = express.Router();
router.use(protect);
router.get(
  "/dashboard",
  authorizeRoles("admin", "accounts"),
  controller.getDashboard,
);
router.get("/users", authorizeRoles("admin"), controller.listUsers);
router.post("/users", authorizeRoles("admin"), controller.createUser);
router.put("/users/:id", authorizeRoles("admin"), controller.updateUser);

module.exports = router;
