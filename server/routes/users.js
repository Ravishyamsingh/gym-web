const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const {
  getMe,
  getAllUsers,
  getAdminStats,
  toggleBlock,
  updateFaceDescriptor,
  getFaceDescriptor,
} = require("../controllers/userController");

// Authenticated user routes
router.get("/me", verifyToken, getMe);
router.get("/me/face-descriptor", verifyToken, getFaceDescriptor);
router.put("/me/face-descriptor", verifyToken, updateFaceDescriptor);

// Admin-only routes
router.get("/admin/stats", verifyToken, requireAdmin, getAdminStats);
router.get("/", verifyToken, requireAdmin, getAllUsers);
router.put("/:id/block", verifyToken, requireAdmin, toggleBlock);
router.put("/:id/payment-status", verifyToken, requireAdmin, require("../controllers/userController").updatePaymentStatus);

module.exports = router;
