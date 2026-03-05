import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { loadFaceModels, extractBestDescriptor, descriptorToArray } from "@/lib/faceApi";
import api from "@/lib/api";
import { ScanFace } from "lucide-react";

export default function FaceRegistrationPage() {
  const { dbUser, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(null); // { current, total, score }

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // If payment not complete, redirect to membership page
  // If face already registered, redirect to dashboard
  useEffect(() => {
    if (dbUser && dbUser.paymentStatus !== "active") {
      navigate("/onboarding/membership", { replace: true });
    } else if (dbUser && dbUser.faceRegistered) {
      navigate("/dashboard", { replace: true });
    }
  }, [dbUser, navigate]);

  // ── Attach stream to video element once it's rendered ──
  useEffect(() => {
    if (cameraStarted && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStarted]);

  // ── Start camera & load models ──
  const startCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      // Show the video element first (this renders it into the DOM)
      setCameraStarted(true);

      // Load face models (video feed is already visible while this loads)
      await loadFaceModels();
      setModelsLoaded(true);
    } catch (err) {
      console.error("Camera/model error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Camera access denied or face models failed to load.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraStarted(false);
  };

  // ── Capture face descriptor (multi-sample for reliability) ───────────────
  const handleCapture = async () => {
    setError("");
    setLoading(true);
    setCaptureProgress(null);

    try {
      // Take 5 samples and pick the best quality detection
      const result = await extractBestDescriptor(
        videoRef.current,
        5,    // numSamples
        400,  // delayMs between samples
        (progress) => setCaptureProgress(progress)
      );

      if (!result) {
        setError(
          "No reliable face detected. Please ensure good lighting, look directly at the camera, and try again."
        );
        setCaptureProgress(null);
        setLoading(false);
        return;
      }

      // Convert Float32Array to plain number array for JSON/MongoDB storage
      const descriptorArray = descriptorToArray(result.descriptor);

      // Update face descriptor on server
      await api.put("/users/me/face-descriptor", {
        faceDescriptor: descriptorArray,
      });

      // Refresh profile to update context
      await refreshProfile();
      stopCamera();
      setCaptureProgress(null);

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save face");
      setCaptureProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-light mb-2">Register Your Face</h1>
          <p className="text-white/60">
            This will be used for gym entry verification
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-blood/10 border border-blood/30 px-4 py-3 text-sm text-blood">
            {error}
          </div>
        )}

        {/* Camera Section */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 mb-8">
          <div className="space-y-5 text-center">
            <p className="text-sm text-white/60">
              Look directly at the camera. Good lighting helps. We'll save a face fingerprint (not the photo).
            </p>

            {cameraStarted ? (
              <>
                <div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border-2 border-blood/40">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      // When the element mounts, attach the stream immediately
                      if (el && streamRef.current && !el.srcObject) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  {!modelsLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-void/80">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blood border-t-transparent" />
                    </div>
                  )}
                  {captureProgress && (
                    <div className="absolute bottom-0 inset-x-0 bg-void/80 px-3 py-2 text-center">
                      <p className="text-xs text-white/80">
                        Scanning {captureProgress.current}/{captureProgress.total}
                        {captureProgress.score !== null && (
                          <span className="ml-2 text-emerald-400">
                            Quality: {Math.round(captureProgress.score * 100)}%
                          </span>
                        )}
                      </p>
                      <div className="mt-1 h-1 w-full rounded bg-white/10">
                        <div
                          className="h-1 rounded bg-blood transition-all"
                          style={{ width: `${(captureProgress.current / captureProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      stopCamera();
                      setModelsLoaded(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    disabled={loading || !modelsLoaded}
                    onClick={handleCapture}
                  >
                    {loading ? "Processing…" : "Capture Face"}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                size="lg"
                className="w-full gap-3"
                onClick={startCamera}
                disabled={loading}
              >
                <ScanFace size={24} />
                {loading ? "Loading…" : "Open Camera"}
              </Button>
            )}

            <p className="text-xs text-white/40">
              Member: <span className="text-light">{dbUser?.name}</span>
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-white/60 text-sm">
            Your face data is encrypted and stored securely. It will only be used for gym entry verification.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
