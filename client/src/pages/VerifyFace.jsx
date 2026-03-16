import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import UserLayout from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadFaceModels,
  extractBestDescriptor,
  normalizeDescriptor,
  compareDescriptors,
} from "@/lib/faceApi";
import api from "@/lib/api";
import { ScanFace, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyFace() {
  const { dbUser, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const storedDescriptorRef = useRef(null); // Fresh copy from server

  const [status, setStatus] = useState("idle"); // idle | loading | scanning | verifying | granted | denied
  const [message, setMessage] = useState("");
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState(dbUser?.email || "");
  const [fallbackOtp, setFallbackOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const action = searchParams.get("action") === "exit" ? "exit" : "entry";
  const isExitAction = action === "exit";

  useEffect(() => {
    setFallbackEmail(dbUser?.email || "");
  }, [dbUser?.email]);

  // Check if user has active membership
  const hasActiveMembership = dbUser?.paymentStatus === "active";
  const isFaceRegistered = dbUser?.faceRegistered === true;

  // ── Fetch stored descriptor from server (fresh copy) ─────
  const fetchStoredDescriptor = async () => {
    try {
      const { data } = await api.get("/users/me/face-descriptor");
      const normalized = normalizeDescriptor(data.faceDescriptor);
      if (!normalized) {
        throw new Error("Invalid stored descriptor");
      }
      storedDescriptorRef.current = normalized;
      return true;
    } catch (err) {
      console.error("Failed to fetch stored descriptor:", err);
      return false;
    }
  };

  // ── Start camera & models ─────────────
  const startCamera = useCallback(async () => {
    setStatus("loading");
    setMessage("Starting camera…");

    try {
      // Fetch stored face descriptor from server first
      setMessage("Loading face data…");
      const hasDescriptor = await fetchStoredDescriptor();
      if (!hasDescriptor) {
        setStatus("denied");
        setMessage("No baseline face on file. Please complete face registration first.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setMessage("Loading face models…");
      await loadFaceModels();

      setStatus("scanning");
      setMessage("Look directly at the camera, then tap Verify");
    } catch {
      setStatus("denied");
      setMessage("Camera access denied or face models failed to load.");
    }
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const resetFallback = () => {
    setShowEmailFallback(false);
    setOtpSent(false);
    setFallbackOtp("");
    setOtpLoading(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ── Verify face (multi-sample for accuracy) ───────────────────────
  const handleVerify = async () => {
    setStatus("verifying");
    setMessage("Analysing your face…");

    try {
      // Use multi-sample extraction for more reliable verification
      const result = await extractBestDescriptor(
        videoRef.current,
        3,    // numSamples — fewer than registration since speed matters
        300,  // delayMs
        (progress) => {
          setMessage(
            `Scanning ${progress.current}/${progress.total}` +
            (progress.score !== null ? ` (quality: ${Math.round(progress.score * 100)}%)` : "")
          );
        }
      );

      if (!result) {
        setStatus("scanning");
        setMessage("No face detected — reposition and try again.");
        return;
      }

      // Compare against the fresh stored descriptor from server
      const stored = storedDescriptorRef.current;
      if (!stored) {
        setStatus("denied");
        setMessage("No baseline face on file. Please re-register.");
        stopCamera();
        return;
      }

      const { match, distance } = compareDescriptors(result.descriptor, stored);

      if (!match) {
        setStatus("denied");
        setMessage(`Face mismatch (distance: ${distance.toFixed(3)}). Access denied.`);
        setShowEmailFallback(true);
        stopCamera();
        return;
      }

      // Face matched — call the backend to log attendance
      setMessage(isExitAction ? "Face matched! Logging exit…" : "Face matched! Logging check-in…");
      const { data } = await api.post(isExitAction ? "/attendance/checkout" : "/attendance");
      await refreshProfile();

      stopCamera();
      setStatus("granted");
      if (isExitAction) {
        setMessage(`Exit verified! Session closed (${data.durationMinutes || 0} min).`);
      } else {
        setMessage(`Access granted! Streak: ${data.currentStreak} days 🔥`);
      }
    } catch (err) {
      stopCamera();
      const errMsg = err.response?.data?.error || err.message || "Verification failed";
      setStatus("denied");
      setMessage(errMsg);
      setShowEmailFallback(true);
    }
  };

  const requestOtpFallback = async () => {
    const email = String(fallbackEmail || "").trim();
    if (!email) {
      setMessage("Please enter your registered email");
      return;
    }

    try {
      setOtpLoading(true);
      setMessage("Sending OTP to your email…");
      await api.post("/attendance/request-fallback-otp", {
        email,
        action,
      });
      setOtpSent(true);
      setMessage("OTP sent. Check your inbox and enter the 6-digit code.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtpFallback = async () => {
    const email = String(fallbackEmail || "").trim();
    const otp = String(fallbackOtp || "").trim();

    if (!email || !otp) {
      setMessage("Email and OTP are required");
      return;
    }

    try {
      setOtpLoading(true);
      setMessage(isExitAction ? "Verifying OTP for exit…" : "Verifying OTP for entry…");
      const endpoint = isExitAction ? "/attendance/verify-exit-otp" : "/attendance/verify-entry-otp";
      const { data } = await api.post(endpoint, { email, otp });

      await refreshProfile();
      stopCamera();
      setStatus("granted");
      resetFallback();
      setMessage(
        isExitAction
          ? `Exit verified via OTP! Session closed (${data.durationMinutes || 0} min).`
          : `Entry verified via OTP! You can enter the gym now.`
      );
    } catch (err) {
      setStatus("denied");
      setMessage(err.response?.data?.error || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <UserLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-lg space-y-6 text-center"
      >
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          {isExitAction ? "Verify Exit" : "Verify Entry"}
        </h1>
        <p className="text-sm text-white/50">
          {isExitAction
            ? "Face verification is required before exiting the gym."
            : "Your face is your membership card."}
        </p>

        {/* Membership check */}
        {!isExitAction && !hasActiveMembership && (
          <div className="rounded-xl border border-blood/30 bg-blood/10 px-6 py-4">
            <p className="text-sm text-blood font-semibold">
              You don't have an active membership. Please activate your membership first.
            </p>
          </div>
        )}

        {hasActiveMembership && !isFaceRegistered && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-4">
            <p className="text-sm text-yellow-400 font-semibold">
              Please complete face registration first.
            </p>
          </div>
        )}

        {/* ── Video feed ─────────────────── */}
        <div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border-2 border-white/10">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

          {(status === "loading" || status === "verifying") && (
            <div className="absolute inset-0 flex items-center justify-center bg-void/80">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blood border-t-transparent" />
            </div>
          )}
        </div>

        {/* ── Result overlay ─────────────── */}
        <AnimatePresence>
          {status === "granted" && (
            <motion.div
              key="granted"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4"
            >
              <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={48} />
              <p className="text-lg font-bold text-emerald-400">{message}</p>
            </motion.div>
          )}
          {status === "denied" && (
            <motion.div
              key="denied"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-blood/30 bg-blood/10 px-6 py-4"
            >
              <XCircle className="mx-auto mb-2 text-blood" size={48} />
              <p className="text-lg font-bold text-blood">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action buttons ─────────────── */}
        {status === "idle" && (
            <Button
              size="xl"
              className="w-full gap-3"
              onClick={startCamera}
              disabled={(isExitAction ? !isFaceRegistered : (!hasActiveMembership || !isFaceRegistered))}
            >
            <ScanFace size={24} />
            Open Camera
          </Button>
        )}

        {status === "scanning" && (
          <Button size="xl" className="w-full gap-3" onClick={handleVerify}>
            <ScanFace size={24} />
              {isExitAction ? "Verify & Exit" : "Verify & Enter"}
          </Button>
        )}

        {(status === "granted" || status === "denied") && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              storedDescriptorRef.current = null;
              setStatus("idle");
              setMessage("");
              resetFallback();
            }}
          >
            Try Again
          </Button>
        )}

        {status === "denied" && !showEmailFallback && (
          <Button
            variant="outline"
            size="lg"
            className="w-full border-yellow-500/35 text-yellow-300 hover:bg-yellow-500/10"
            onClick={() => setShowEmailFallback(true)}
          >
            Use Email Fallback
          </Button>
        )}

        {status === "denied" && showEmailFallback && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 space-y-3 text-left">
            <p className="text-sm font-semibold text-yellow-300">Email OTP Fallback</p>
            <input
              type="email"
              value={fallbackEmail}
              onChange={(e) => setFallbackEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="w-full rounded-lg border border-white/15 bg-void/60 px-3 py-2 text-sm text-light placeholder-white/40 focus:outline-none focus:border-yellow-500/40"
            />

            {!otpSent && (
              <Button
                className="w-full"
                onClick={requestOtpFallback}
                disabled={otpLoading}
              >
                {otpLoading ? "Sending OTP…" : "Send OTP"}
              </Button>
            )}

            {otpSent && (
              <>
                <input
                  type="text"
                  value={fallbackOtp}
                  onChange={(e) => setFallbackOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full rounded-lg border border-white/15 bg-void/60 px-3 py-2 text-sm text-light placeholder-white/40 focus:outline-none focus:border-yellow-500/40"
                />
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={verifyOtpFallback}
                  disabled={otpLoading}
                >
                  {otpLoading ? "Verifying OTP…" : isExitAction ? "Verify OTP & Exit" : "Verify OTP & Enter"}
                </Button>
              </>
            )}
          </div>
        )}

        {status !== "idle" && <p className="text-xs text-white/40">{message}</p>}
      </motion.div>
    </UserLayout>
  );
}
