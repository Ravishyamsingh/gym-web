import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import api from "@/lib/api";

export default function PaymentPage() {
  const { dbUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = location.state?.plan;

  // If user already has active payment, redirect to next step
  useEffect(() => {
    if (dbUser?.paymentStatus === "active") {
      if (!dbUser.faceRegistered) {
        navigate("/onboarding/face-registration", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [dbUser?.paymentStatus, dbUser?.faceRegistered, navigate]);

  // If no plan was passed, redirect back to membership selection
  if (!plan) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">No plan selected</p>
          <Button onClick={() => navigate("/onboarding/membership")}>
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      await api.post("/payments/process", {
        planId: plan.id,
        duration: plan.duration,
        amount: plan.price,
      });

      // Refresh user profile to get updated payment status
      await refreshProfile();

      // Redirect to face registration
      navigate("/onboarding/face-registration");
    } catch (err) {
      setError(err.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-light mb-2">Complete Payment</h1>
          <p className="text-white/60">Secure payment processing</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-blood/10 border border-blood/30 px-4 py-3 text-sm text-blood">
            {error}
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 mb-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-white/60">Plan</span>
              <span className="text-light font-semibold">{plan.duration}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-white/60">Amount</span>
              <span className="text-light font-semibold">₹{plan.price}</span>
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="text-white font-semibold">Total</span>
              <span className="text-2xl font-bold text-blood">₹{plan.price}</span>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white mb-4"
          size="lg"
        >
          {loading ? "Processing Payment…" : `Pay ₹${plan.price}`}
        </Button>

        {/* Back Button */}
        <Button
          onClick={() => navigate("/onboarding/membership")}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Back to Plans
        </Button>

        {/* Security Info */}
        <p className="text-center text-white/40 text-sm mt-6">
          Your payment is secure and encrypted
        </p>
      </motion.div>
    </div>
  );
}
