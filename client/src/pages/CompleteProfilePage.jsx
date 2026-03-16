import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { loadFaceModels, extractDescriptor } from "@/lib/faceApi";
import api from "@/lib/api";
import { ScanFace } from "lucide-react"; 


export default function CompleteProfilePage() {
  const { dbUser, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ── Start camera & load models ──
  const startCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
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

      // Update face descriptor
      await api.put("/users/me/face-descriptor", {
        faceDescriptor: Array.from(descriptor),
      });

      // Refresh profile to update context
      await refreshProfile();
      stopCamera();

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save face");
    } finally {
      setLoading(false);
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
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-bold tracking-wider text-light">
            OM MURUGA <span className="text-blood">OLYMPIA FITNESS</span>
          </span>
        </div>

        <h1 className="mb-2 text-center text-xl font-semibold text-light">Complete Your Profile</h1>
        <p className="mb-6 text-center text-sm text-white/50">
          Capture your baseline face to enable facial recognition entry.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-blood/10 border border-blood/30 px-4 py-2 text-sm text-blood">
            {error}
          </div>
        )}

        <div className="space-y-5 text-center">
          <p className="text-sm text-white/50">
            Look directly at the camera. Good lighting helps. We'll save a face fingerprint (not the photo).
          </p>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border-2 border-blood/40">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            {!modelsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-void/80">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blood border-t-transparent" />
              </div>
            )}
          </div>

          {!modelsLoaded ? (
            <Button size="lg" className="w-full gap-3" onClick={startCamera} disabled={loading}>
              <ScanFace size={24} />
              {loading ? "Loading…" : "Open Camera"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full gap-3"
              disabled={loading}
              onClick={handleCapture}
            >
              <ScanFace size={24} />
              {loading ? "Processing…" : "Capture & Continue"}
            </Button>
          )}

          <p className="text-xs text-white/40">
            Member: <span className="text-light">{dbUser?.name}</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
