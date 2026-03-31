import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadFaceModels,
  extractBestDescriptorWithValidation,
  descriptorToArray,
} from "@/lib/faceApi";
import api from "@/lib/api";
import { ScanFace, CheckCircle2, XCircle, Clock, Eye, EyeOff } from "lucide-react";

export default function FaceVerificationFlow({ onAccessGranted, onNeedRegistration }) {
  const { dbUser } = useAuth();
  const [searchParams] = useSearchParams();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | loading | ready | scanning | verifying | granted | denied | needs-registration
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [matchScore, setMatchScore] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [error, setError] = useState(null);
  const [showOtpFallback, setShowOtpFallback] = useState(false);
  const [otpEmail, setOtpEmail] = useState(dbUser?.email || "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const action = searchParams.get("action") === "exit" ? "exit" : "entry";
  const isExitAction = action === "exit";

  // Check if user has active membership (both status and expiry date)
  const hasActiveMembership = useMemo(() => {
    if (!dbUser) return false;
    if (dbUser.paymentStatus !== "active") return false;
    if (!dbUser.membershipExpiry) return false;
    // Check if membership has not expired
    return new Date(dbUser.membershipExpiry) > new Date();
  }, [dbUser]);

  const membershipExpired = useMemo(() => {
    if (!dbUser?.membershipExpiry) return false;
    return new Date(dbUser.membershipExpiry) <= new Date();
  }, [dbUser?.membershipExpiry]);

  // ── Check if user has face registered ──
  useEffect(() => {
    if (!dbUser?.faceRegistrationCompleted) {
      setStatus("needs-registration");
      setMessage("Face not registered. Please complete face registration first.");
    } else if (membershipExpired) {
      setStatus("denied");
      setMessage("Your membership is not active.");
      setError(`Your membership expired on ${new Date(dbUser.membershipExpiry).toLocaleDateString()}. Please renew your membership to continue.`);
    }
  }, [dbUser?.faceRegistrationCompleted, membershipExpired, dbUser?.membershipExpiry]);

  // ── Initialize camera and load models ──
  const initializeCamera = useCallback(async () => {
    setStatus("loading");
    setMessage("Initializing camera...");
    setError(null);

    try {
      // Load face models
      setMessage("Loading face recognition models...");
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
      setMessage(
        isExitAction
          ? "Look at camera for exit verification"
          : "Look at camera for entry verification"
      );
    } catch (err) {
      console.error("[FaceVerification] Camera init failed:", err);
      
      let errorMessage = err.message || "Camera access denied";
      let helpText = "";
      
      // Provide specific help for different error types
      if (err.message?.includes("model") || err.message?.includes("Models")) {
        helpText = "Face recognition models failed to load. Please: 1) Clear browser cache, 2) Restart your browser, 3) Check internet connection.";
      } else if (err.message?.includes("camera") || err.message?.includes("Permission")) {
        helpText = "Camera access denied. Please check your browser permissions and try again.";
      }
      
      setStatus("denied");
      setError(helpText || errorMessage);
      setShowOtpFallback(true);
    }
  }, [isExitAction]);

  // ── Start face verification ──
  const startFaceVerification = useCallback(async () => {
    if (!videoRef.current) {
      setError("Video element not available");
      return;
    }

    setStatus("scanning");
    setMessage("Scanning face deeply for verification...");
    setProgress(0);
    setMatchScore(null);
    setConfidenceScore(null);
    setError(null);

    try {
      // Extract face descriptor with ENHANCED deep scanning (10 samples default)
      const result = await extractBestDescriptorWithValidation(
        videoRef.current,
        10, // Increased from 5 to 10 for deeper, more accurate verification
        550,
        (progressUpdate) => {
          setProgress(Math.round((progressUpdate.current / progressUpdate.total) * 100));
          if (progressUpdate.score) {
            setConfidenceScore(Math.round(progressUpdate.score * 100));
          }
        }
      );

      if (!result || !result.descriptor) {
        setStatus("ready");
        setMessage("No quality face detected. Please try again.");
        setError("Could not detect face. Ensure good lighting and look directly at camera.");
        return;
      }

      // Verify with backend
      setStatus("verifying");
      setMessage("Verifying face...");

      const descriptorArray = descriptorToArray(result.descriptor);
      const verifyResponse = await api.post("/face/verify", {
        capturedFaceDescriptor: descriptorArray,
        action,
      });

      // Face match successful
      if (verifyResponse.data.verified) {
        setMatchScore(Math.round(verifyResponse.data.confidence));
        setStatus("granted");
        setMessage("✓ Face verified! Access granted.");
        setProgress(100);

        // Call success callback after delay
        setTimeout(() => {
          if (onAccessGranted) onAccessGranted();
        }, 1500);
      }
    } catch (err) {
      const errorData = err.response?.data || {};

      if (errorData.code === "FACE_NOT_REGISTERED") {
        setStatus("needs-registration");
        setMessage("Face not registered");
        if (onNeedRegistration) onNeedRegistration();
        return;
      }

      if (errorData.code === "MEMBERSHIP_EXPIRED" || errorData.code === "PAYMENT_INACTIVE") {
        setStatus("denied");
        setMessage("Your membership is not active.");
        setError("Please renew your membership to access the gym.");
      } else if (errorData.code === "FACE_MISMATCH") {
        setMatchScore(Math.round(errorData.confidence || 0));
        setStatus("denied");
        setMessage("Face does not match. Access denied.");
        setError("The scanned face does not match your registered face.");
      } else {
        setStatus("denied");
        setError(errorData.error || err.message || "Verification failed");
        setMessage("Verification failed");
      }

      setShowOtpFallback(true);
    }
  }, [action, onAccessGranted, onNeedRegistration]);

  // ── Send OTP for fallback ──
  const sendOtp = useCallback(async () => {
    if (!otpEmail) {
      setError("Email is required");
      return;
    }

    setOtpLoading(true);
    setError(null);

    try {
      await api.post("/attendance/request-otp", {
        email: otpEmail,
        action,
      });

      setOtpSent(true);
      setMessage("OTP sent to your email");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }, [otpEmail, action]);

  // ── Verify OTP ──
  const verifyOtp = useCallback(async () => {
    if (!otpCode) {
      setError("Please enter OTP");
      return;
    }

    setOtpLoading(true);
    setError(null);

    try {
      const response = await api.post("/attendance/verify-otp", {
        email: otpEmail,
        otp: otpCode,
        action,
      });

      if (response.data.verified) {
        setStatus("granted");
        setMessage("✓ Access granted via OTP");
        setTimeout(() => {
          if (onAccessGranted) onAccessGranted();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  }, [otpCode, otpEmail, action, onAccessGranted]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // ── Initialize on mount ──
  useEffect(() => {
    if (status === "idle" && dbUser?.faceRegistrationCompleted) {
      initializeCamera();
    }
  }, [status, dbUser?.faceRegistrationCompleted, initializeCamera]);

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
            className={`inline-block p-4 rounded-full mb-4 ${
              isExitAction
                ? "bg-red-100"
                : "bg-green-100"
            }`}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ScanFace className={`w-8 h-8 ${isExitAction ? "text-red-600" : "text-green-600"}`} />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isExitAction ? "Exit Verification" : "Entry Verification"}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            {isExitAction ? "Verify face to exit gym" : "Verify face for gym access"}
          </p>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {/* Video Preview */}
          {[
            "loading",
            "ready",
            "scanning",
            "verifying",
          ].includes(status) && (
            <motion.div
              className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-6 border-4 border-blue-200"
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

              {/* Loading Overlay */}
              {status === "loading" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                  </div>
                </div>
              )}

              {/* Scanning Progress */}
              {status === "scanning" && (
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-50 flex flex-col items-center justify-end pb-4">
                  <div className="w-32 bg-slate-700 rounded-full h-2 mb-2">
                    <motion.div
                      className="bg-blue-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-white text-sm font-semibold">{progress}%</p>
                </div>
              )}

              {/* Verifying Indicator */}
              {status === "verifying" && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                  <div className="animate-spin">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-green-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Access Granted */}
          {status === "granted" && (
            <motion.div
              className="w-full rounded-lg bg-green-50 border-2 border-green-200 p-6 text-center mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-green-900 mb-1">Access Granted!</p>
              {matchScore && (
                <p className="text-sm text-green-700">Match: {matchScore}%</p>
              )}
            </motion.div>
          )}

          {/* Access Denied */}
          {status === "denied" && (
            <motion.div
              className="w-full rounded-lg bg-red-50 border-2 border-red-200 p-6 text-center mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <p className="font-semibold text-red-900 mb-1">Access Denied</p>
              {matchScore !== null && (
                <p className="text-sm text-red-700">Match: {matchScore}%</p>
              )}
              {error && (
                <p className="text-xs text-red-700 mt-2">{error}</p>
              )}
            </motion.div>
          )}

          {/* Needs Registration */}
          {status === "needs-registration" && (
            <motion.div
              className="w-full rounded-lg bg-yellow-50 border-2 border-yellow-200 p-6 text-center mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Eye className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <p className="font-semibold text-yellow-900">Face Not Registered</p>
              <p className="text-sm text-yellow-700 mt-2">
                Please complete face registration first
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Message */}
        <motion.p className="text-center text-sm text-slate-600 mb-6 h-6">
          {message}
        </motion.p>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4">
          {status === "ready" && (
            <>
              <Button
                variant="primary"
                className="flex-1"
                onClick={startFaceVerification}
              >
                <ScanFace className="w-4 h-4 mr-2" />
                Scan Face
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowOtpFallback(!showOtpFallback)}
              >
                <Clock className="w-4 h-4 mr-2" />
                Use OTP
              </Button>
            </>
          )}

          {status === "scanning" && (
            <Button variant="secondary" className="w-full" disabled>
              Scanning...
            </Button>
          )}

          {status === "verifying" && (
            <Button variant="secondary" className="w-full" disabled>
              Verifying...
            </Button>
          )}

          {status === "granted" && (
            <Button
              variant="primary"
              className="w-full"
              onClick={onAccessGranted}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Continue
            </Button>
          )}

          {status === "denied" && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setStatus("ready");
                setError(null);
                setMatchScore(null);
              }}
            >
              Try Again
            </Button>
          )}

          {status === "needs-registration" && (
            <Button
              variant="primary"
              className="w-full"
              onClick={onNeedRegistration}
            >
              Register Face
            </Button>
          )}

          {status === "loading" && (
            <Button variant="secondary" className="w-full" disabled>
              Loading...
            </Button>
          )}
        </div>

        {/* OTP Fallback */}
        {showOtpFallback && (
          <motion.div
            className="mt-6 pt-6 border-t"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-semibold text-slate-700 mb-3">
              📧 Verify via Email OTP
            </p>

            <div className="space-y-3">
              <input
                type="email"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                placeholder="Your email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                disabled={otpSent}
              />

              {!otpSent ? (
                <Button
                  variant="secondary"
                  className="w-full text-sm"
                  onClick={sendOtp}
                  disabled={otpLoading || !otpEmail}
                >
                  {otpLoading ? "Sending..." : "Send OTP"}
                </Button>
              ) : (
                <>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    maxLength="6"
                  />
                  <Button
                    variant="primary"
                    className="w-full text-sm"
                    onClick={verifyOtp}
                    disabled={otpLoading || otpCode.length !== 6}
                  >
                    {otpLoading ? "Verifying..." : "Verify OTP"}
                  </Button>
                </>
              )}

              {error && (
                <p className="text-xs text-red-600 text-center">{error}</p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
