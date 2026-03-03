import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import api from "@/lib/api";

const MEMBERSHIP_PLANS = [
  {
    id: "1month",
    duration: "1 Month",
    price: 500,
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
    price: 2500,
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
    price: 5000,
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
  const { dbUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [processingPlan, setProcessingPlan] = useState(null);
  const [error, setError] = useState("");

  // If user already has active payment, redirect to dashboard
  if (dbUser?.paymentStatus === "active") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handlePayNow = async (plan) => {
    setProcessingPlan(plan.id);
    setError("");

    try {
      // Process payment directly (simulated for now)
      await api.post("/payments/process", {
        planId: plan.id,
        duration: plan.duration,
        amount: plan.price,
      });

      // Refresh user profile to get updated payment status
      await refreshProfile();

      // Redirect to dashboard after successful payment
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-void px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-light mb-3">
            Choose Your Membership Plan
          </h1>
          <p className="text-white/60 text-base">
            Select a plan that works best for you. All plans include full gym access.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-blood/10 border border-blood/30 px-4 py-3 text-sm text-blood text-center">
            {error}
          </div>
        )}

        {/* Membership Plans — horizontal card layout */}
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
                  <h2 className="text-xl font-bold text-light">{plan.duration}</h2>
                  <span className="text-2xl font-bold text-blood">₹{plan.price.toLocaleString("en-IN")}</span>
                </div>
                <p className="text-sm text-white/50 mb-3">{plan.description}</p>
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

              {/* Right — Pay Now Button */}
              <div className="p-6 sm:pl-0 flex items-center">
                <Button
                  onClick={() => handlePayNow(plan)}
                  disabled={!!processingPlan}
                  className="w-full sm:w-auto min-w-[140px] bg-green-600 hover:bg-green-700 text-white font-semibold"
                  size="lg"
                >
                  {processingPlan === plan.id ? "Processing…" : "Pay Now"}
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
      </motion.div>
    </div>
  );
}
