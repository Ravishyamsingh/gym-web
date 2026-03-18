import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import RazorpayCheckout from "@/components/RazorpayCheckout";
import { motion } from "framer-motion";

const MEMBERSHIP_PLANS = [
  {
    id: "1month",
    duration: "1 Month",
    price: 1, // Testing mode - change back to 600 for production
    description: "Perfect for trying out the gym experience",
    features: [
      "Unlimited gym access",
      "Access to all equipment",
      "Basic support",
    ],
  },
  {
    id: "6months",
    duration: "6 Months",
    price: 3000,
    description: "Great value for committed fitness enthusiasts",
    features: [
      "Unlimited gym access",
      "Access to all equipment",
      "Priority support",
      "Monthly fitness report",
    ],
    popular: true,
  },
  {
    id: "1year",
    duration: "1 Year",
    price: 5400,
    description: "Best value — all features included",
    features: [
      "Unlimited gym access",
      "Access to all equipment",
      "Priority support",
      "Monthly fitness report",
      "Free personal training session",
      "Nutrition consultation",
    ],
  },
];

export default function MembershipPage() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // If user already has active payment, redirect to dashboard
  useEffect(() => {
    if (dbUser?.paymentStatus === "active") {
      navigate("/dashboard", { replace: true });
    }
  }, [dbUser?.paymentStatus, navigate]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    // Payment confirmed by webhook
    // Redirect handled by RazorpayCheckout component
  };

  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
    // Show error to user (already handled by RazorpayCheckout)
  };

  return (
    <div className="min-h-screen bg-void px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* ═══════════════════════════════════════════════════════ */}
        {/* Show Plans if Not Selected */}
        {/* ═══════════════════════════════════════════════════════ */}
        {!showCheckout ? (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-light mb-3">
                Choose Your Membership Plan
              </h1>
              <p className="text-white/60 text-base">
                Select a plan that works best for you. All plans include full gym access.
              </p>
            </div>

            {/* Membership Plans */}
            <div className="space-y-4 mb-10">
              {MEMBERSHIP_PLANS.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-xl border-2 bg-surface transition-all hover:border-white/20 ${
                    plan.popular
                      ? "border-green-500/40 relative"
                      : "border-white/10"
                  }`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <span className="absolute -top-3 left-6 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  {/* Left — Plan Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-baseline gap-3 mb-1">
                      <h2 className="text-xl font-bold text-light">
                        {plan.duration}
                      </h2>
                      <span className="text-2xl font-bold text-blood">
                        ₹{plan.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mb-3">
                      {plan.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center text-xs text-white/70 bg-white/5 rounded-full px-3 py-1"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right — Select Button */}
                  <div className="p-6 sm:pl-0 flex items-center">
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full sm:w-auto min-w-[140px] bg-green-600 hover:bg-green-700 text-white font-semibold"
                      size="lg"
                    >
                      Select
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info */}
            <div className="bg-surface border border-white/10 rounded-xl p-6 text-center">
              <p className="text-white/50 text-sm">
                All plans include unlimited gym access and equipment usage. Cancel anytime. No hidden charges.
              </p>
            </div>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════ */
          /* Show Checkout if Plan Selected */
          /* ═══════════════════════════════════════════════════════ */
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-light mb-2">
                Complete Payment
              </h1>
              <p className="text-white/60">
                Secure payment processing via Razorpay
              </p>
            </div>

            {/* Checkout Component */}
            <div className="max-w-md mx-auto">
              <RazorpayCheckout
                planId={selectedPlan.id}
                planName={selectedPlan.duration}
                amount={selectedPlan.price}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            </div>

            {/* Back Button */}
            <div className="text-center mt-6">
              <Button
                onClick={() => {
                  setShowCheckout(false);
                  setSelectedPlan(null);
                }}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                ← Back to Plans
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

