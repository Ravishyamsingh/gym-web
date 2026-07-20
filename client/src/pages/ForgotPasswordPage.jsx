import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { auth } from "@/lib/firebase";

function mapResetError(err) {
  const code = err?.code || "";

  if (code === "auth/user-not-found") {
    return "No account found with that email address.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }

  return "Unable to send reset email right now. Please try again.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
      setSuccess("Password reset link sent. Please check your email inbox and open the link.");
    } catch (err) {
      setError(mapResetError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-white/5 bg-surface p-8"
      >
        <Link to="/" className="mb-8 block text-center">
          <span className="font-display text-3xl font-bold tracking-wider text-light">
            OM MURUGA <span className="text-blood">OLYMPIA FITNESS</span>
          </span>
        </Link>

        <h1 className="mb-2 text-center text-xl font-semibold text-light">Forgot Password</h1>
        <p className="mb-6 text-center text-sm text-white/50">
          Enter your email and we&apos;ll send a password reset link.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-blood/30 bg-blood/10 px-4 py-3 text-sm text-blood">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="resetEmail">Email Address</Label>
            <Input
              id="resetEmail"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? "Sending reset link..." : "Reset Password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Remembered your password? {" "}
          <Link to="/login" className="text-blood hover:underline">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
