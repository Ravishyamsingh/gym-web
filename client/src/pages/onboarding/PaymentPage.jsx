import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import RazorpayCheckout from "@/components/RazorpayCheckout";
import { motion } from "framer-motion";

export default function PaymentPage() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
          <p className="text-white/60">Secure payment processing via Razorpay</p>
        </div>

        {/* Razorpay Checkout Component */}
        <RazorpayCheckout
          planId={plan.id}
          planName={plan.duration}
          amount={plan.price}
          onPaymentSuccess={() => {
            // Payment confirmed by webhook
            // Redirect handled by RazorpayCheckout component
          }}
          onPaymentError={(error) => {
            console.error("Payment failed:", error);
          }}
        />

        {/* Back Button */}
        <Button
          onClick={() => navigate("/onboarding/membership")}
          variant="outline"
          className="w-full mt-6"
        >
          Back to Plans
        </Button>
      </motion.div>
    </div>
  );
}

