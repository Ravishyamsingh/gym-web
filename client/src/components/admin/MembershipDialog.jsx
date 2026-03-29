import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { X, AlertCircle, Loader } from "lucide-react";
import api from "@/lib/api";

export default function MembershipDialog({
  isOpen,
  user,
  onClose,
  onSuccess,
}) {
  const [status, setStatus] = useState(user?.paymentStatus || "pending");
  const [planId, setPlanId] = useState(user?.membershipPlan || "");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState(null);

  const plans = [
    { id: "1month", label: "1 Month", duration: "1 month" },
    { id: "3months", label: "3 Months", duration: "3 months" },
    { id: "6months", label: "6 Months", duration: "6 months" },
    { id: "1year", label: "12 Months", duration: "12 months" },
  ];

  const handleValidate = async () => {
    if (!planId) {
      setError("Please select a plan");
      return;
    }

    try {
      setIsValidating(true);
      setError(null);
      const { data } = await api.post("/admin/membership/validate-amount", {
        userId: user._id,
        planId,
      });
      setValidationResult(data.amountDetails);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to validate amount");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!planId && status === "active") {
      setError("Please select a plan for activation");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        userId: user._id,
        newStatus: status,
      };

      if (status === "active") {
        payload.planId = planId;
        payload.reason = `Manual activation by admin - Plan: ${planId}`;
      } else {
        payload.reason = `Status updated by admin to: ${status}`;
      }

      const { data } = await api.post("/admin/membership/update", payload);
      onSuccess(data.message);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update membership");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface border border-white/10 rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-light">Update Membership</h2>
            <p className="text-xs text-white/40 mt-1">{user.name}</p>
            <p className="text-xs text-white/40">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-900/20 border border-red-900/40 rounded-lg flex gap-3"
          >
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Current Status */}
        <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-white/40 mb-2">Current Status</p>
          <div className="flex items-center justify-between">
            <div>
              <Badge
                variant={
                  user.paymentStatus === "active"
                    ? "active"
                    : user.paymentStatus === "pending"
                    ? "pending"
                    : "expired"
                }
              >
                {user.paymentStatus}
              </Badge>
              {user.membershipPlan && (
                <div className="text-xs text-white/60 mt-2">
                  Plan: <span className="font-mono bg-white/5 px-2 py-0.5 rounded">{user.membershipPlan}</span>
                </div>
              )}
              {user.membershipExpiry && (
                <div className="text-xs text-white/60 mt-1">
                  Expires: {new Date(user.membershipExpiry).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-white/60 mb-2">New Status</label>
          <div className="grid grid-cols-3 gap-2">
            {["active", "pending", "expired"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setValidationResult(null);
                }}
                className={`px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                  status === s
                    ? "bg-blood/30 border-blood text-blood"
                    : "border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Selection (show if status is active) */}
        {status === "active" && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-white/60 mb-2">Select Plan</label>
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setPlanId(plan.id);
                    setValidationResult(null);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-xs text-left transition-all ${
                    planId === plan.id
                      ? "bg-blood/30 border-blood text-light"
                      : "border-white/10 text-white/60 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium">{plan.label}</div>
                  <div className="text-xs opacity-60">{plan.duration}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Validation Result */}
        {validationResult && status === "active" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-blood/10 border border-blood/20 rounded-lg"
          >
            <p className="text-xs text-white/60 mb-2">Membership Fee Breakdown</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Plan Amount:</span>
                <span className="text-light font-mono">₹{validationResult.planAmount}</span>
              </div>
              {validationResult.registrationFeeAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Registration Fee (First-time):</span>
                  <span className="text-blood font-mono">₹{validationResult.registrationFeeAmount}</span>
                </div>
              )}
              <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-xs font-bold">
                <span className="text-light">Total Amount:</span>
                <span className="text-blood font-mono">₹{validationResult.totalAmount}</span>
              </div>
              {validationResult.isFirstTimeUser && (
                <div className="text-xs text-blood mt-2">
                  ✓ Includes registration fee for first-time user
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {status === "active" && !validationResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={isValidating || !planId}
              className="flex-1 gap-2"
            >
              {isValidating && <Loader size={14} className="animate-spin" />}
              Calculate
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || isValidating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || isValidating || (status === "active" && !planId)}
            className="flex-1 gap-2"
          >
            {isSubmitting && <Loader size={14} className="animate-spin" />}
            Update
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
