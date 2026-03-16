import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { motion } from "framer-motion";
import { Chrome } from "lucide-react";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/;

function sanitizePassword(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export default function RegisterPage() {
  const { signupWithPassword, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect after successful account creation
  const navigateAfterAuth = (user) => {
    if (user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  // Validation
  const validateInputs = () => {
    if (!name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return false;
    }
    const sanitizedPassword = sanitizePassword(password);
    if (!strongPasswordRegex.test(sanitizedPassword)) {
      setError(
        "Password must be 8-64 characters with uppercase, lowercase, number, and special character"
      );
      return false;
    }
    if (sanitizedPassword !== sanitizePassword(confirmPassword)) {
      setError("Passwords don't match");
      return false;
    }
    if (userId && !/^[a-z0-9_-]{3,20}$/i.test(userId)) {
      setError(
        "User ID must be 3-20 characters (alphanumeric, underscore, hyphen)"
      );
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateInputs()) return;

    setLoading(true);

    try {
      const user = await signupWithPassword(
        email,
        userId || null,
        sanitizePassword(password),
        name
      );
      setSuccess("Account created successfully!");
      setTimeout(() => navigateAfterAuth(user), 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Registration failed";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-Up
  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      const user = await loginWithGoogle();
      navigateAfterAuth(user);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Google sign-up failed";
      setError(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl border border-white/5 bg-surface p-8"
      >
        {/* Brand */}
        <Link to="/" className="mb-8 block text-center">
          <span className="font-display text-3xl font-bold tracking-wider text-light">
            OM MURUGA <span className="text-blood">OLYMPIA FITNESS</span>
          </span>
        </Link>

        <h1 className="mb-6 text-center text-xl font-semibold text-light">
          Create your account
        </h1>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg bg-blood/10 border border-blood/30 px-4 py-3 text-sm text-blood"
          >
            {error}
          </motion.div>
        )}

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-500"
          >
            {success}
          </motion.div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* User ID (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="userId">
              User ID <span className="text-white/40">(optional)</span>
            </Label>
            <Input
              id="userId"
              type="text"
              placeholder="john_doe123"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toLowerCase())}
              disabled={loading}
            />
            <p className="text-xs text-white/40">
              3-20 characters: letters, numbers, underscore, hyphen
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || !name || !email || !password}
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Google Sign-Up */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {googleLoading ? "Signing up…" : "Continue with Google"}
        </Button>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link to="/login" className="text-blood hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
