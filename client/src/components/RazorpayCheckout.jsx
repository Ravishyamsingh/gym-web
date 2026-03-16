
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function RazorpayCheckout({
  planId,
  planName,
  amount,
  onPaymentSuccess,
  onPaymentError,
}) {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentState, setPaymentState] = useState("idle"); // idle | processing | verifying | success | error
  const [orderId, setOrderId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  /**
   * Step 1: Create payment order on backend
   */
  const createOrder = async () => {
    try {
      setError("");
      setPaymentState("processing");
      setStatusMessage("Creating payment order...");

      const { data } = await api.post("/payments/create-order", {
        planId,
      });

      // Order created successfully
      setOrderId(data.orderId);
      console.log("✅ Order created:", data.orderId);

      // Proceed to checkout
      openRazorpayCheckout(data);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to create payment order";
      setError(errorMsg);
      setPaymentState("error");
      setStatusMessage("");
      console.error("❌ Order creation failed:", errorMsg);

      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
    }
  };

  /**
   * Step 2: Open Razorpay checkout (UPI-only)
   */
  const openRazorpayCheckout = (orderData) => {
    const { checkoutConfig, keyId, orderId } = orderData;

    // Create Razorpay checkout options
    const options = {
      key: keyId,
      order_id: orderId,
      amount: orderData.amount, // in paise
      currency: "INR",
      name: "Om Muruga Olympia Fitness",
      description: `${planName} Membership`,
      image: "/logo.png",
      prefill: checkoutConfig.prefill,
      notes: checkoutConfig.notes,
      theme: checkoutConfig.theme,

      // ═════════════════════════════════════════════════════════
      // UPI-ONLY CONFIGURATION
      // ═════════════════════════════════════════════════════════
      // Show only UPI payment method
      method: {
        upi: true, // ✅ Show UPI
        card: false, // ❌ Hide card
        netbanking: false, // ❌ Hide netbanking
        wallet: false, // ❌ Hide wallets
        emandate: false, // ❌ Hide EMI
      },

      // Timeout after 15 minutes
      timeout: 900,

      // ═════════════════════════════════════════════════════════
      // CALLBACK HANDLERS
      // ═════════════════════════════════════════════════════════
      // ⚠️ IMPORTANT: These are NOT trusted for payment confirmation
      // Backend webhook is the source of truth
      handler: (response) => {
        handlePaymentSuccess(response);
      },

      modal: {
        // Triggered when customer closes checkout (X button or back)
        ondismiss: () => {
          handlePaymentClosed();
        },
      },

      // Authentication modal enabled
      recurring: false,
    };

    // ═════════════════════════════════════════════════════════
    // Open Razorpay Checkout
    // ═════════════════════════════════════════════════════════
    if (!window.Razorpay) {
      setError("Razorpay checkout script failed to load");
      setPaymentState("error");
      return;
    }

    const rzp = new window.Razorpay(options);

    // Custom error handler
    rzp.on("payment.failed", (response) => {
      handlePaymentFailed(response);
    });

    // Open checkout UI
    rzp.open();
    setPaymentState("processing");
  };

  /**
   * Step 3: Handle successful payment response from Razorpay
   *
   * ⚠️ IMPORTANT:
   * This callback is for UX only.
   * We don't mark user as paid here.
   * Backend webhook confirms the actual payment.
   */
  const handlePaymentSuccess = async (response) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      response;

    console.log("✅ Razorpay success response received:", {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });

    try {
      setPaymentState("verifying");
      setStatusMessage("Verifying payment signature...");

      // Step 3a: Verify payment signature with backend
      // This confirms the payment object came from Razorpay
      const { data } = await api.post("/payments/verify", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      console.log("✅ Payment signature verified:", data);

      // Step 3b: Poll for webhook confirmation
      setStatusMessage("Confirming payment with bank...");
      await pollPaymentStatus(razorpay_order_id);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Payment verification failed";
      console.error("❌ Payment verification failed:", errorMsg);
      setError(errorMsg);
      setPaymentState("error");

      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
    }
  };

  /**
   * Step 4: Poll payment status until webhook confirms it
   *
   * Webhook updates payment status in database.
   * Frontend polls /api/payments/{orderId}/status to check status.
   */
  const pollPaymentStatus = async (orderId) => {
    const maxAttempts = 30; // Poll for max 3 minutes (30 * 6 seconds)
    let attempts = 0;

    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/${orderId}/status`);

        console.log("📍 Payment status check:", data.status);

        if (data.isPaid && data.webhookVerified) {
          // 🎉 Payment confirmed by webhook
          console.log("✅ Payment confirmed by webhook!");
          setPaymentState("success");
          setStatusMessage("Payment successful! Setting up your membership...");

          // Refresh user profile to get updated membership status
          await refreshProfile();

          // Call success callback
          if (onPaymentSuccess) {
            onPaymentSuccess(data);
          }

          // Redirect after 2 seconds
          setTimeout(() => {
            navigate("/onboarding/face-registration");
          }, 2000);

          return;
        }

        // Payment still pending
        attempts++;
        if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 6000); // Poll every 6 seconds
        } else {
          // Timeout: payment not confirmed
          console.warn(
            "⏱️  Payment confirmation timeout. Customer will be notified via email."
          );
          setPaymentState("success"); // Show as success anyway
          setStatusMessage(
            "Payment received! Confirming with your bank. You'll be notified shortly."
          );

          // Refresh profile in case webhook catches up
          setTimeout(() => {
            refreshProfile().then(() => {
              navigate("/onboarding/face-registration");
            });
          }, 5000);
        }
      } catch (err) {
        console.error("Error polling payment status:", err.message);
        // Continue polling on error
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 6000);
        }
      }
    };

    // Start polling
    poll();
  };

  /**
   * Handle payment closure (X button or back)
   */
  const handlePaymentClosed = () => {
    console.log("User closed Razorpay checkout");
    setPaymentState("idle");
    setStatusMessage("");
    setError("Payment cancelled");
  };

  /**
   * Handle payment failure
   */
  const handlePaymentFailed = (response) => {
    console.error("❌ Payment failed:", response);
    setPaymentState("error");
    setError(
      response.error?.description ||
        "Payment failed. Please try again or contact support."
    );

    if (onPaymentError) {
      onPaymentError(
        response.error?.description || "Payment failed"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* ═════════════════════════════════════════════════════════ */}
      {/* Error Display */}
      {/* ═════════════════════════════════════════════════════════ */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-500">
          <p className="font-semibold mb-1">Payment Failed</p>
          <p>{error}</p>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* Status Message */}
      {/* ═════════════════════════════════════════════════════════ */}
      {statusMessage && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-3 text-sm text-blue-500">
          {statusMessage}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* Payment Summary */}
      {/* ═════════════════════════════════════════════════════════ */}
      {paymentState === "idle" && (
        <div className="bg-surface border border-white/10 rounded-2xl p-8 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <span className="text-white/60">Plan</span>
            <span className="text-light font-semibold">{planName}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <span className="text-white/60">Amount</span>
            <span className="text-light font-semibold">₹{amount}</span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-white font-semibold">Total</span>
            <span className="text-2xl font-bold text-blood">₹{amount}</span>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* Pay Button */}
      {/* ═════════════════════════════════════════════════════════ */}
      {paymentState === "idle" && (
        <Button
          onClick={createOrder}
          disabled={loading || paymentState !== "idle"}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          size="lg"
        >
          {loading ? "Processing..." : `Pay ₹${amount} via UPI`}
        </Button>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* Processing State */}
      {/* ═════════════════════════════════════════════════════════ */}
      {paymentState !== "idle" && paymentState !== "error" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="w-12 h-12 border-4 border-white/20 border-t-blood rounded-full animate-spin" />
          <p className="text-white/60 text-sm">{statusMessage}</p>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* Info */}
      {/* ═════════════════════════════════════════════════════════ */}
      <div className="rounded-lg bg-surface border border-white/10 p-6 text-center space-y-2">
        <p className="text-white/60 text-sm">
          💳 UPI/QR Payment (No Card Required)
        </p>
        <p className="text-white/40 text-xs">
          Payment is secure and encrypted. Your UPI details are safe.
        </p>
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* Important Notes */}
      {/* ═════════════════════════════════════════════════════════ */}
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-600/70 space-y-2">
        <p className="font-semibold text-yellow-600">ℹ️ Important:</p>
        <ul className="space-y-1 ml-3 list-disc">
          <li>Payment is processed securely via Razorpay</li>
          <li>Your membership starts immediately after confirmation</li>
          <li>You will receive a confirmation email</li>
          <li>If payment times out, your membership will activate once confirmed</li>
        </ul>
      </div>
    </div>
  );
}
