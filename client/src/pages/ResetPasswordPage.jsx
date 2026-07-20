import { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import api from "@/lib/api";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/;

function sanitizePassword(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

function validateStrongPassword(password) {
  if (!strongPasswordRegex.test(password)) {
    return "Password must be 8-64 characters and include uppercase, lowercase, number, and special character.";
  }
  return "";
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = useMemo(() => searchParams.get("oobCode") || "", [searchParams]);
  const mode = useMemo(() => searchParams.get("mode") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const invalidLink = !oobCode || (mode && mode !== "resetPassword");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (invalidLink) {
      setError("Invalid reset link. Please request a new password reset email.");
      return;
    }

    const sanitizedNewPassword = sanitizePassword(newPassword);
    const sanitizedConfirmPassword = sanitizePassword(confirmPassword);

    if (!sanitizedNewPassword || !sanitizedConfirmPassword) {
      setError("Both password fields are required.");
      return;
    }

    const strongPasswordError = validateStrongPassword(sanitizedNewPassword);
    if (strongPasswordError) {
      setError(strongPasswordError);
      return;
    }

    if (sanitizedNewPassword !== sanitizedConfirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/password/reset", {
        oobCode,
        newPassword: sanitizedNewPassword,
        confirmPassword: sanitizedConfirmPassword,
      });

      setSuccess(data?.message || "Password reset successful. You can now log in.");
      setTimeout(() => navigate("/login"), 1300);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Unable to reset password.";
      setError(msg);
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

        <h1 className="mb-2 text-center text-xl font-semibold text-light">Reset Password</h1>
        <p className="mb-6 text-center text-sm text-white/50">
          Enter your new password and confirm it to continue.
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
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50 hover:text-white/80"
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                disabled={loading}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50 hover:text-white/80"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-white/45">
            Password must be 8-64 characters and include uppercase, lowercase, number, and special character.
          </p>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Resetting password..." : "Set New Password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Back to {" "}
          <Link to="/login" className="text-blood hover:underline">
            login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
