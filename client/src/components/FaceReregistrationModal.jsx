import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import {
  loadFaceModels,
  extractBestDescriptorWithValidation,
  captureVideoFrameAsBase64,
  descriptorToArray,
} from "@/lib/faceApi";
import api from "@/lib/api";
import { Camera, X, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function FaceReregistrationModal({ isOpen, onClose, onSuccess }) {
  const { dbUser, refreshProfile } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | loading | ready | capturing | processing | success | error
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // ── Initialize camera ──
  const initializeCamera = useCallback(async () => {
    if (!isOpen) return;

    setStatus("loading");
    setMessage("Starting camera...");
    setError(null);

    try {
      setMessage("Loading face models (this may take 30-60 seconds)...");
      await loadFaceModels();

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
      setMessage("Ready to re-register face");
    } catch (err) {
      console.error("[FaceReregister] Init failed:", err);
      
      let errorMessage = err.message || "Failed to start camera";
      let helpText = "";
      
      // Provide specific help for different error types
      if (err.message?.includes("model") || err.message?.includes("Models")) {
        helpText = "Face models failed to load. Please: 1) Clear browser cache, 2) Restart browser, 3) Check internet.";
      } else if (err.message?.includes("camera") || err.message?.includes("Permission")) {
        helpText = "Camera access denied. Check your browser permissions.";
      }
      
      setStatus("error");
      setError(helpText || errorMessage);
    }
  }, [isOpen]);

  // ── Start re-registration ──
  const startReregistration = useCallback(async () => {
    if (!videoRef.current) {
      setError("Video element not available");
      return;
    }

    setStatus("capturing");
    setMessage("Scanning new face deeply...");
    setProgress(0);
    setError(null);

    try {
      const result = await extractBestDescriptorWithValidation(
        videoRef.current,
        10, // Enhanced: 10 samples for powerful re-registration
        550,
        (progressUpdate) => {
          setProgress(Math.round((progressUpdate.current / progressUpdate.total) * 100));
        }
      );

      if (!result || !result.descriptor) {
        setStatus("ready");
        setError("No quality face detected. Please try again.");
        return;
      }

      setMessage("Capturing profile picture...");
      const profilePicture = await captureVideoFrameAsBase64(videoRef.current, 0.9);

      setCapturedImage(profilePicture);
      setStatus("processing");
      setMessage("Updating face...");

      const descriptorArray = descriptorToArray(result.descriptor);

      await api.put("/face/re-register", {
        faceDescriptor: descriptorArray,
        profilePictureBase64: profilePicture,
      });

      setStatus("success");
      setMessage("✓ Face updated successfully!");
      setProgress(100);

      // Refresh profile
      await refreshProfile();

      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("[FaceReregister] Error:", err);
      setStatus("error");
      setError(err.response?.data?.error || err.message || "Failed to re-register face");
    }
  }, [onSuccess, refreshProfile]);

  // ── Close modal ──
  const handleClose = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setStatus("idle");
    setCapturedImage(null);
    setProgress(0);
    setError(null);
    onClose();
  }, [onClose]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // ── Initialize when modal opens ──
  useEffect(() => {
    if (isOpen && status === "idle") {
      initializeCamera();
    } else if (!isOpen) {
      handleClose();
    }
  }, [isOpen, status, initializeCamera, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Re-register Face</h3>
            <p className="text-xs text-slate-600 mt-1">Update your face for gym access</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            disabled={["capturing", "processing"].includes(status)}
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Video Preview */}
        {["loading", "ready", "capturing", "processing"].includes(status) && (
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 border-4 border-purple-200">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Loading Overlay */}
            {status === "loading" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="animate-spin">
                  <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full"></div>
                </div>
              </div>
            )}

            {/* Capturing Progress */}
            {status === "capturing" && (
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-50 flex flex-col items-center justify-end pb-4">
                <div className="w-24 bg-slate-700 rounded-full h-2 mb-2">
                  <motion.div
                    className="bg-purple-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-white text-xs font-semibold">{progress}%</p>
              </div>
            )}

            {/* Processing Indicator */}
            {status === "processing" && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin">
                  <div className="w-10 h-10 border-3 border-purple-200 border-t-green-500 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {status === "success" && capturedImage && (
          <div className="w-full aspect-video rounded-lg overflow-hidden mb-4 border-4 border-green-200">
            <img
              src={capturedImage}
              alt="Updated profile"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Message */}
        <p className="text-center text-sm text-slate-600 mb-4 h-5">
          {message}
        </p>

        {/* Error Message */}
        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-red-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          </motion.div>
        )}

        {/* Success Indicator */}
        {status === "success" && (
          <motion.div
            className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-green-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Face updated successfully!
            </p>
          </motion.div>
        )}

        {/* Instructions */}
        {status === "ready" && (
          <div className="bg-purple-50 rounded-lg p-3 mb-4 border border-purple-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">📋 Tips:</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>✓ Good lighting on face</li>
              <li>✓ Look directly at camera</li>
              <li>✓ Center your face in frame</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === "ready" && (
            <>
              <Button
                variant="primary"
                className="flex-1 text-sm"
                onClick={startReregistration}
              >
                <Camera className="w-4 h-4 mr-1" />
                Re-register
              </Button>
              <Button
                variant="secondary"
                className="flex-1 text-sm"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </>
          )}

          {status === "capturing" && (
            <Button variant="secondary" className="w-full text-sm" disabled>
              Scanning...
            </Button>
          )}

          {status === "processing" && (
            <Button variant="secondary" className="w-full text-sm" disabled>
              Processing...
            </Button>
          )}

          {status === "success" && (
            <Button
              variant="primary"
              className="w-full text-sm"
              onClick={handleClose}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Done
            </Button>
          )}

          {status === "error" && (
            <>
              <Button
                variant="primary"
                className="flex-1 text-sm"
                onClick={startReregistration}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
              <Button
                variant="secondary"
                className="flex-1 text-sm"
                onClick={handleClose}
              >
                Close
              </Button>
            </>
          )}

          {status === "loading" && (
            <Button variant="secondary" className="w-full text-sm" disabled>
              Loading...
            </Button>
          )}
        </div>

        {/* Info */}
        {dbUser?.faceLastReregisteredAt && (
          <p className="text-xs text-slate-500 text-center mt-4">
            Last updated: {new Date(dbUser.faceLastReregisteredAt).toLocaleDateString()}
          </p>
        )}
      </motion.div>
    </div>
  );
}
