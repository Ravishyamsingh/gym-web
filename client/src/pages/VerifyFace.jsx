import { useState, useRef, useEffect, useCallback } from "react";
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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const storedDescriptorRef = useRef(null); // Fresh copy from server

  const [status, setStatus] = useState("idle"); // idle | loading | scanning | verifying | granted | denied
  const [message, setMessage] = useState("");

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
        stopCamera();
        return;
      }

      // Face matched — call the backend to log attendance
      setMessage("Face matched! Logging check-in…");
      const { data } = await api.post("/attendance");
      await refreshProfile();

      stopCamera();
      setStatus("granted");
      setMessage(`Access granted! Streak: ${data.currentStreak} days 🔥`);
    } catch (err) {
      stopCamera();
      const errMsg = err.response?.data?.error || err.message || "Verification failed";
      setStatus("denied");
      setMessage(errMsg);
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
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Verify Entry</h1>
        <p className="text-sm text-white/50">Your face is your membership card.</p>

        {/* Membership check */}
        {!hasActiveMembership && (
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
          <Button size="xl" className="w-full gap-3" onClick={startCamera} disabled={!hasActiveMembership || !isFaceRegistered}>
            <ScanFace size={24} />
            Open Camera
          </Button>
        )}

        {status === "scanning" && (
          <Button size="xl" className="w-full gap-3" onClick={handleVerify}>
            <ScanFace size={24} />
            Verify Now
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
            }}
          >
            Try Again
          </Button>
        )}

        {status !== "idle" && <p className="text-xs text-white/40">{message}</p>}
      </motion.div>
    </UserLayout>
  );
}
