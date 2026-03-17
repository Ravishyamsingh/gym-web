import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { motion } from "framer-motion";
import { Chrome, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { loginWithPassword, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [emailOrUserId, setEmailOrUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect based on user role
  const navigateAfterAuth = (user) => {
    if (user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Determine if it's email or userId
      const isEmail = emailOrUserId.includes("@");
      
      const user = await loginWithPassword(
        isEmail ? { email: emailOrUserId } : { userId: emailOrUserId },
        password
      );
      navigateAfterAuth(user);
    } catch (err) {
      const status = err.response?.status;
      const errorMsg = status === 504
        ? "Server is taking too long to respond. Please retry in a few seconds."
        : (err.response?.data?.error || err.message || "Login failed");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const user = await loginWithGoogle();
      navigateAfterAuth(user);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Google sign-in failed";
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
          Welcome back
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="emailOrUserId">Email or User ID</Label>
            <Input
              id="emailOrUserId"
              type="text"
              placeholder="example@gmail.com or username"
              value={emailOrUserId}
              onChange={(e) => setEmailOrUserId(e.target.value.trim())}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50 hover:text-white/80 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || !emailOrUserId || !password}
          >
            {loading ? "Signing in…" : "Log In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Google Sign-In */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {googleLoading ? "Signing in…" : "Continue with Google"}
        </Button>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-white/40">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-blood hover:underline">
            Create Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
