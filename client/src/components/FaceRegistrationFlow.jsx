import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadFaceModels,
  extractBestDescriptorWithValidation,
  captureVideoFrameAsBase64,
  descriptorToArray,
  isValidFaceDetection,
} from "@/lib/faceApi";
import api from "@/lib/api";
import { ScanFace, CheckCircle2, XCircle, Camera, RefreshCw } from "lucide-react";

export default function FaceRegistrationFlow({ onSuccess, onSkip }) {
  const { dbUser, refreshProfile } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | loading | ready | capturing | processing | success | error
  const [message, setMessage] = useState("Initialize camera");
  const [progress, setProgress] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);

  // ── Initialize camera and load models ──
  const initializeCamera = useCallback(async () => {
    setStatus("loading");
    setMessage("Initializing camera...");
    setError(null);

    try {
      // Load face models first
      setMessage("Loading face recognition models (this may take 30-60 seconds)...");
      await loadFaceModels();

      // Request camera access
      setMessage("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });
      }

      setStatus("ready");
      setMessage("Camera ready. Look directly at the camera and click 'Scan Face' to begin.");
    } catch (err) {
      console.error("[FaceRegistration] Camera initialization failed:", err);
      
      let errorMessage = err.message || "Failed to initialize camera";
      let helpText = "";
      
      // Provide specific help for different error types
      if (err.message?.includes("model") || err.message?.includes("Models")) {
        helpText = "The face recognition models failed to load. Please try: 1) Clear browser cache (Ctrl+Shift+Delete), 2) Restart your browser, 3) Check your internet connection. Model files should be in /public/models/.";
      } else if (err.message?.includes("camera") || err.message?.includes("Permission")) {
        helpText = "Camera access was denied. Please: 1) Check browser permissions for camera access, 2) Reload the page, 3) Try in incognito/private mode if persists.";
      }
      
      setStatus("error");
      setError(helpText || errorMessage);
      setMessage(helpText ? "Setup Error" : "Camera access denied or unavailable");
    }
  }, []);

  // ── Start face scanning ──
  const startFaceCapture = useCallback(async () => {
    if (!videoRef.current) {
      setError("Video element not available");
      return;
    }

    setStatus("capturing");
    setMessage("Scanning face deeply...");
    setProgress(0);
    setConfidenceScore(null);
    setError(null);

    try {
      // Use canvas overlay for visual feedback
      if (canvasRef.current && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }

      // Extract best face descriptor with ENHANCED deep scanning (10 samples default)
      const result = await extractBestDescriptorWithValidation(
        videoRef.current,
        10, // Increased from 5 to 10 for deeper, more powerful scanning
        550, // Slight delay increase for stability
        (progressUpdate) => {
          setProgress(Math.round((progressUpdate.current / progressUpdate.total) * 100));
          if (progressUpdate.score) {
            setConfidenceScore(Math.round(progressUpdate.score * 100));
          }
        }
      );

      if (!result || !result.descriptor) {
        setStatus("ready");
        setMessage("No quality face detected. Please ensure good lighting and look directly at the camera.");
        setShowRetry(true);
        return;
      }

      // Capture profile picture from current video frame
      setMessage("Capturing profile picture...");
      const profilePicture = await captureVideoFrameAsBase64(videoRef.current, 0.9);

      setCapturedImage(profilePicture);
      setStatus("processing");
      setMessage("Registering face...");

      // Convert descriptor to array for JSON serialization
      const descriptorArray = descriptorToArray(result.descriptor);

      // Send to backend
      const response = await api.post("/face/register", {
        faceDescriptor: descriptorArray,
        profilePictureBase64: profilePicture,
      });

      setStatus("success");
      setMessage("✓ Face registered successfully!");
      setProgress(100);

      // Refresh user profile to update faceRegistered flag
      await refreshProfile();

      // Call success callback after delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error("[FaceRegistration] Capture failed:", err);
      setStatus("error");
      setError(err.response?.data?.error || err.message || "Failed to register face");
      setShowRetry(true);
    }
  }, [onSuccess, refreshProfile]);

  // ── Cleanup camera on unmount ──
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // ── Initialize on mount ──
  useEffect(() => {
    if (status === "idle") {
      initializeCamera();
    }
  }, [status, initializeCamera]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            className="inline-block p-4 bg-blue-100 rounded-full mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ScanFace className="w-8 h-8 text-blue-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-900">Face Registration</h2>
          <p className="text-sm text-slate-600 mt-2">Set up your face for gym access</p>
        </div>

        {/* Video Preview */}
        <AnimatePresence>
          {["loading", "ready", "capturing", "processing"].includes(status) && (
            <motion.div
              className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6 border-4 border-blue-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: status === "capturing" ? "block" : "none" }}
              />

              {/* Loading Overlay */}
              {status === "loading" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                  </div>
                </div>
              )}

              {/* Capturing Progress */}
              {status === "capturing" && (
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-75 flex flex-col items-center justify-center pb-8">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-500 rounded-full"></div>
                  </motion.div>
                  <p className="text-white text-sm font-semibold mt-4">Deep Scanning...</p>
              
                  <div className="w-40 bg-slate-700 rounded-full h-3 mt-4">
                    <motion.div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-blue-200 text-xs mt-2">{progress}% Complete | {progress !== 0 ? Math.ceil((progress / 100) * 10) : 0}/10 Samples</p>
                  
                  {confidenceScore && (
                    <div className="mt-3 text-center">
                      <p className="text-green-300 text-xs font-semibold">✓ Face Detected</p>
                      <p className="text-blue-300 text-xs">Confidence: {confidenceScore}%</p>
                    </div>
                  )}
                </div>
              )}

              {/* Processing Indicator */}
              {status === "processing" && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                  <div className="animate-spin">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-green-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Success State */}
          {status === "success" && capturedImage && (
            <motion.div
              className="w-full aspect-video rounded-lg overflow-hidden mb-6 border-4 border-green-200"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <img
                src={capturedImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </motion.div>
          )}

          {/* Error State */}
          {status === "error" && (
            <motion.div
              className="w-full rounded-lg bg-red-50 border-2 border-red-200 p-4 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900">{error}</p>
                  {showRetry && (
                    <p className="text-xs text-red-700 mt-1">Please try again with better lighting</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Message */}
        <motion.p className="text-center text-sm text-slate-600 mb-6 h-6">
          {message}
        </motion.p>

        {/* Instructions */}
        {status === "ready" && (
          <motion.div
            className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-xs text-slate-700 font-semibold mb-3">📋 For Best Results:</p>
            <ul className="text-xs text-slate-600 space-y-2">
              <li>✓ <strong>Good Lighting:</strong> Ensure face is well-lit, no harsh shadows</li>
              <li>✓ <strong>Direct Look:</strong> Look straight at the camera, centered</li>
              <li>✓ <strong>Proper Distance:</strong> Face should fill ~40-60% of frame</li>
              <li>✓ <strong>No Occlusion:</strong> Hair shouldn't cover eyes or face</li>
              <li>✓ <strong>Stable Head:</strong> Keep head still during scanning</li>
              <li className="text-blue-700 font-semibold">→ We'll capture 10 deep samples for powerful recognition</li>
            </ul>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {status === "ready" && (
            <>
              <Button
                variant="primary"
                className="flex-1"
                onClick={startFaceCapture}
                disabled={status !== "ready"}
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Face
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onSkip}
              >
                Skip for Now
              </Button>
            </>
          )}

          {status === "capturing" && (
            <Button
              variant="secondary"
              className="w-full"
              disabled
            >
              Scanning...
            </Button>
          )}

          {status === "processing" && (
            <Button
              variant="secondary"
              className="w-full"
              disabled
            >
              Processing...
            </Button>
          )}

          {status === "success" && (
            <Button
              variant="primary"
              className="w-full"
              onClick={onSuccess}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Continue
            </Button>
          )}

          {status === "error" && showRetry && (
            <>
              <Button
                variant="primary"
                className="flex-1"
                onClick={startFaceCapture}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setStatus("ready");
                  setShowRetry(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </>
          )}

          {status === "loading" && (
            <Button variant="secondary" className="w-full" disabled>
              Loading...
            </Button>
          )}
        </div>

        {/* Help Text */}
        {status === "error" && (
          <p className="text-xs text-slate-500 mt-4 text-center">
            Having trouble? Ensure your device has a camera and proper permissions.
          </p>
        )}
      </motion.div>

      {/* Footer Note */}
      <p className="text-xs text-slate-500 mt-6 text-center max-w-md">
        Your face data is stored securely and used only for gym access verification.
      </p>
    </div>
  );
}
