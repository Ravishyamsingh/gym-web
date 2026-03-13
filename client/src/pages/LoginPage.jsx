import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { motion } from "framer-motion";
import { Chrome } from "lucide-react";



export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      navigateAfterAuth(user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
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
      setError(err.response?.data?.error || err.message || "Google sign-in failed");
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
            GYM<span className="text-blood">WEB</span>
          </span>
        </Link>

        <h1 className="mb-6 text-center text-xl font-semibold text-light">Welcome back</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-blood/10 border border-blood/30 px-4 py-2 text-sm text-blood">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Log In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Google Sign-In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          disabled={googleLoading}
          onClick={handleGoogleSignIn}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {googleLoading ? "Signing in…" : "Continue with Google"}
        </Button>

        <p className="mt-6 text-center text-sm text-white/40">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-blood hover:underline">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
