import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { motion } from "framer-motion";
import { Chrome } from "lucide-react";
import api from "@/lib/api";

export default function RegisterPage() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect after auth — all users go to dashboard first
  const navigateAfterAuth = (user) => {
    if (user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  // ── Check if user exists in database ────
  const checkUserExists = async (userEmail) => {
    try {
      const { data } = await api.get("/auth/check-user", {
        params: { email: userEmail },
      });
      return data.exists;
    } catch {
      return false;
    }
  };

  // ── Handle form submission ────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Check if user exists
      const userExists = await checkUserExists(email);
      if (userExists) {
        setError("User already exists. Please login instead.");
        setLoading(false);
        return;
      }

      // Register user without face descriptor (will be added during onboarding)
      const user = await signup(email, password, name, []);
      
      // Redirect based on onboarding status
      navigateAfterAuth(user);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Registration failed";
      // Make Firebase error codes more user-friendly
      if (msg.includes("auth/email-already-in-use")) {
        setError("This email is already registered. Please sign in instead.");
      } else if (msg.includes("auth/weak-password")) {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (msg.includes("auth/invalid-email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Google Sign-In ─────────���────
  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const user = await loginWithGoogle();
      navigateAfterAuth(user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Google sign-up failed");
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
        <Link to="/" className="mb-8 block text-center">
          <span className="font-display text-3xl font-bold tracking-wider text-light">
            GYM<span className="text-blood">WEB</span>
          </span>
        </Link>

        <h1 className="mb-6 text-center text-xl font-semibold text-light">Create your account</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-blood/10 border border-blood/30 px-4 py-2 text-sm text-blood">
            {error}
          </div>
        )}

        {/* ── Registration Form ─────────────────── */}
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Creating account…" : "Sign Up"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Google Sign-Up Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          disabled={googleLoading}
          onClick={handleGoogleSignIn}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {googleLoading ? "Signing up…" : "Continue with Google"}
        </Button>

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
