import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { motion } from "framer-motion";
import { loadFaceModels, extractDescriptor } from "@/lib/faceApi";

export default function RegisterPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1 = form, 2 = face capture
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ── Step 2: Start camera & load models ──
  const startCamera = useCallback(async () => {
    try {
      setLoading(true);
      await loadFaceModels();
      setModelsLoaded(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied or face models failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // ── Capture baseline face ───────────────
  const handleCapture = async () => {
    setError("");
    setLoading(true);

    try {
      const descriptor = await extractDescriptor(videoRef.current);
      if (!descriptor) {
        setError("No face detected. Please look directly at the camera and try again.");
        setLoading(false);
        return;
      }

      // Register user with the face descriptor
      const user = await signup(email, password, name, Array.from(descriptor));
      stopCamera();
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Advance from step 1 → 2 ────────────
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setStep(2);
    startCamera();
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

        <h1 className="mb-6 text-center text-xl font-semibold text-light">
          {step === 1 ? "Create your account" : "Baseline Face Capture"}
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-blood/10 border border-blood/30 px-4 py-2 text-sm text-blood">
            {error}
          </div>
        )}

        {/* ── Step 1: Form ─────────────────── */}
        {step === 1 && (
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
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
                placeholder="you@example.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Next — Capture Face
            </Button>
          </form>
        )}

        {/* ── Step 2: Face capture ─────────── */}
        {step === 2 && (
          <div className="space-y-5 text-center">
            <p className="text-sm text-white/50">
              Look directly at the camera. Good lighting helps. We&apos;ll save a face fingerprint (not the photo).
            </p>

            <div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border-2 border-blood/40">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              {!modelsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-void/80">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blood border-t-transparent" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  stopCamera();
                  setStep(1);
                }}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={loading || !modelsLoaded}
                onClick={handleCapture}
              >
                {loading ? "Processing…" : "Capture & Register"}
              </Button>
            </div>
          </div>
        )}

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
