import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

let modelsLoaded = false;

/**
 * Load the three required face-api.js neural network models.
 * Safe to call multiple times — loads only once.
 * Throws a descriptive error if any model file is missing or fails to load.
 */
export async function loadFaceModels() {
  if (modelsLoaded) return;

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log("✅ face-api.js models loaded");
  } catch (err) {
    // Provide a clear message so developers know which files are expected
    console.error(
      "❌ Failed to load face-api.js models. Ensure the following files " +
        "exist inside client/public/models/:\n" +
        "  - ssd_mobilenetv1_model-weights_manifest.json + shard files\n" +
        "  - face_landmark_68_model-weights_manifest.json + shard files\n" +
        "  - face_recognition_model-weights_manifest.json + shard files\n" +
        "Original error:",
      err
    );
    throw new Error(
      "Face recognition models failed to load. Please check that model files are present in /public/models/."
    );
  }
}

/**
 * Extract a 128-dimensional face descriptor from a video or image element.
 * Returns a Float32Array or null if no face is detected.
 */
export async function extractDescriptor(input) {
  const detection = await faceapi
    .detectSingleFace(input)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? detection.descriptor : null;
}

/**
 * Enhanced Face Detection Thresholds for More Robust Scanning
 */

/**
 * Minimum detection confidence to consider a face capture reliable.
 * Lowered from 0.85 to 0.80 for better real-world detection
 * while still maintaining accuracy
 */
const MIN_CONFIDENCE = 0.80;

/**
 * Stricter threshold for face matching (lower = more strict/accurate)
 * Lowered from 0.45 to 0.40 for better face matching precision
 * This reduces false positives while allowing minor lighting/angle variations
 */
const FACE_MATCH_THRESHOLD = 0.40;

/**
 * Minimum face size (in pixels) to consider valid
 * Lowered from 80 to 60 to allow detection at slightly greater distances
 * Prevents matching against very small/distant faces but more forgiving
 */
const MIN_FACE_SIZE = 60;

/**
 * Minimum number of facial landmarks that must be detected
 * Ensures face is clear enough for proper recognition
 */
const MIN_LANDMARKS = 65; // out of 68, allow 3 to be occluded

/**
 * Minimum face area ratio (face width * height / total canvas area)
 * Ensures face is prominent enough in the frame
 * Value between 0 and 1 (5% of canvas area minimum)
 */
const MIN_FACE_AREA_RATIO = 0.05;

/**
 * Maximum face angle (in degrees) from the camera plane
 * Prevents matching against severely tilted/rotated faces
 */
const MAX_FACE_ANGLE = 25;

/**
 * Extract the best face descriptor from multiple samples.
 * Takes `numSamples` readings, filters by minimum confidence,
 * and returns the descriptor with the highest detection score.
 *
 * @param {HTMLVideoElement} input
 * @param {number} numSamples — number of capture attempts (default 5)
 * @param {number} delayMs    — interval between captures (default 400ms)
 * @param {(progress: {current: number, total: number, score: number | null}) => void} onProgress
 * @returns {Promise<{descriptor: Float32Array, score: number} | null>}
 */
export async function extractBestDescriptor(input, numSamples = 5, delayMs = 400, onProgress) {
  let bestDescriptor = null;
  let bestScore = 0;

  for (let i = 0; i < numSamples; i++) {
    const detection = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();

    const score = detection?.detection?.score ?? 0;

    if (onProgress) {
      onProgress({ current: i + 1, total: numSamples, score: detection ? score : null });
    }

    if (detection && score > MIN_CONFIDENCE && score > bestScore) {
      bestScore = score;
      bestDescriptor = detection.descriptor;
    }

    // wait between samples so the user can adjust slightly
    if (i < numSamples - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return bestDescriptor ? { descriptor: bestDescriptor, score: bestScore } : null;
}

/**
 * Convert a face descriptor (Float32Array or number[]) to a plain JS number array
 * suitable for JSON serialization and MongoDB storage.
 * Ensures every value is a finite number.
 */
export function descriptorToArray(descriptor) {
  const arr = Array.from(descriptor).map(Number);
  if (arr.length !== 128 || !arr.every(Number.isFinite)) {
    throw new Error("Invalid descriptor: expected 128 finite numbers");
  }
  return arr;
}

/**
 * Normalize a stored descriptor (plain number[] from DB) into a Float32Array
 * for accurate Euclidean distance comparison.
 */
export function normalizeDescriptor(stored) {
  if (!stored || !Array.isArray(stored) || stored.length !== 128) return null;
  return new Float32Array(stored);
}

/**
 * Compare two face descriptors using Euclidean distance with strict threshold.
 * Handles both Float32Array and plain number[] inputs.
 * Uses FACE_MATCH_THRESHOLD (0.45) instead of loose 0.6 for better accuracy.
 * @param {Float32Array | number[]} d1
 * @param {Float32Array | number[]} d2
 * @param {number} threshold  — default FACE_MATCH_THRESHOLD (0.45, lower = stricter)
 * @returns {{ match: boolean, distance: number }}
 */
export function compareDescriptors(d1, d2, threshold = FACE_MATCH_THRESHOLD) {
  // Ensure both are Float32Array for consistent precision
  const a = d1 instanceof Float32Array ? d1 : new Float32Array(d1);
  const b = d2 instanceof Float32Array ? d2 : new Float32Array(d2);
  
  // Validate descriptor integrity
  if (a.length !== 128 || b.length !== 128) {
    console.error("Invalid descriptor length:", { a: a.length, b: b.length });
    return { match: false, distance: Infinity };
  }
  
  const distance = faceapi.euclideanDistance(a, b);
  const match = distance < threshold;
  
  // Log for debugging
  console.log(`[Face Match] Distance: ${distance.toFixed(4)}, Threshold: ${threshold}, Match: ${match}`);
  
  return { match, distance };
}

/**
 * Enhanced face detection quality validation
 * Checks multiple criteria to ensure high-quality face capture
 * @param {Object} detection - face-api detection object
 * @param {HTMLVideoElement} videoElement - optional, for area ratio calculation
 * @returns {Object} {valid: boolean, score: number (0-100), issues: string[]}
 */
export function isValidFaceDetection(detection, videoElement = null) {
  const issues = [];
  let qualityScore = 100;

  if (!detection || !detection.detection) {
    return { valid: false, score: 0, issues: ["No face detected"] };
  }

  const { score, box } = detection.detection;

  // 1. Check confidence score
  if (score < MIN_CONFIDENCE) {
    issues.push(`Low confidence: ${(score * 100).toFixed(1)}% < ${(MIN_CONFIDENCE * 100).toFixed(1)}%`);
    qualityScore -= (MIN_CONFIDENCE - score) * 50;
  }

  // 2. Check face size (width and height)
  const faceWidth = box.width;
  const faceHeight = box.height;
  const faceSize = Math.min(faceWidth, faceHeight);

  if (faceSize < MIN_FACE_SIZE) {
    issues.push(`Face too small: ${faceSize.toFixed(0)}px < ${MIN_FACE_SIZE}px`);
    qualityScore -= ((MIN_FACE_SIZE - faceSize) / MIN_FACE_SIZE) * 30;
  }

  // 3. Check face area ratio if video element provided
  if (videoElement) {
    const canvasArea = videoElement.videoWidth * videoElement.videoHeight;
    const faceArea = faceWidth * faceHeight;
    const faceAreaRatio = faceArea / canvasArea;

    if (faceAreaRatio < MIN_FACE_AREA_RATIO) {
      issues.push(`Face not prominent: ${(faceAreaRatio * 100).toFixed(1)}% < ${(MIN_FACE_AREA_RATIO * 100).toFixed(1)}%`);
      qualityScore -= ((MIN_FACE_AREA_RATIO - faceAreaRatio) / MIN_FACE_AREA_RATIO) * 20;
    }

    // Warn if face takes up too much of frame (might be too close)
    if (faceAreaRatio > 0.7) {
      issues.push("Face too close to camera - move back slightly");
      qualityScore -= 15;
    }
  }

  // 4. Check landmarks (68 facial points)
  if (!detection.landmarks || !detection.landmarks.positions) {
    issues.push("No facial landmarks detected");
    qualityScore -= 40;
  } else {
    const landmarkCount = detection.landmarks.positions.length;
    if (landmarkCount < MIN_LANDMARKS) {
      issues.push(`Insufficient landmarks: ${landmarkCount} < ${MIN_LANDMARKS}`);
      qualityScore -= ((MIN_LANDMARKS - landmarkCount) / MIN_LANDMARKS) * 35;
    }
  }

  // 5. Check face angle (estimate from landmarks if available)
  if (detection.landmarks && detection.landmarks.positions) {
    const landmarks = detection.landmarks.positions;
    const faceAngle = estimateFaceAngle(landmarks, box);
    
    if (Math.abs(faceAngle.pitch) > MAX_FACE_ANGLE || Math.abs(faceAngle.yaw) > MAX_FACE_ANGLE) {
      issues.push(`Face angle too extreme: pitch=${faceAngle.pitch.toFixed(1)}°, yaw=${faceAngle.yaw.toFixed(1)}°`);
      qualityScore -= 25;
    }
  }

  // 6. Check if face is present (basic presence check)
  if (!detection.descriptor || detection.descriptor.length !== 128) {
    issues.push("Invalid or missing face descriptor");
    qualityScore -= 50;
  }

  // Clamp quality score between 0 and 100
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const valid = issues.length === 0 && qualityScore >= 70;

  console.log(`[FaceValidation] Score: ${qualityScore.toFixed(0)}/100, Confidence: ${(score * 100).toFixed(1)}%, Size: ${faceSize.toFixed(0)}px, Valid: ${valid}`);
  if (issues.length > 0) {
    console.warn(`[FaceValidation] Issues:`, issues);
  }

  return {
    valid,
    score: qualityScore,
    confidence: score * 100,
    faceSize,
    issues,
  };
}

/**
 * Estimate face angle (pitch and yaw) from facial landmarks
 * Provides rough estimate of face orientation
 * @param {Array} landmarks - Array of {x, y} points (68 points)
 * @param {Object} box - {x, y, width, height}
 * @returns {Object} {pitch, yaw} in degrees
 */
function estimateFaceAngle(landmarks, box) {
  // Simplified angle estimation based on key landmarks
  // Uses eye positions and nose to estimate yaw and pitch
  
  if (!landmarks || landmarks.length < 68) {
    return { pitch: 0, yaw: 0 };
  }

  // Get key points: left eye (36), right eye (45), nose (30)
  const leftEye = landmarks[36];
  const rightEye = landmarks[45];
  const nose = landmarks[30];

  if (!leftEye || !rightEye || !nose) {
    return { pitch: 0, yaw: 0 };
  }

  // Calculate yaw (left-right tilt) from eye positions
  const eyeCenter = (leftEye.x + rightEye.x) / 2;
  const boxCenter = box.x + box.width / 2;
  const yawRatio = (eyeCenter - boxCenter) / (box.width / 2);
  const yaw = Math.asin(Math.min(1, Math.max(-1, yawRatio))) * (180 / Math.PI);

  // Calculate pitch (up-down tilt) from eye-to-nose distance
  const eyeY = (leftEye.y + rightEye.y) / 2;
  const eyeNoseVerticalDistance = nose.y - eyeY;
  const boxHeight = box.height;
  const pitchRatio = eyeNoseVerticalDistance / boxHeight;
  const pitch = Math.asin(Math.min(1, Math.max(-1, pitchRatio * 0.3))) * (180 / Math.PI);

  return { pitch, yaw };
}

/**
 * ENHANCED: Extract best face descriptor from multiple samples with deep validation
 * Takes multiple readings with strict quality checks, filters by validation scores,
 * and returns the descriptor with the highest quality score.
 * 
 * Default: 10 samples (increased from 5) for deeper scanning
 * 
 * @param {HTMLVideoElement} input - Video element with live stream
 * @param {number} numSamples - Number of capture attempts (default 10, min 5, max 15)
 * @param {number} delayMs - Interval between captures (default 500ms)
 * @param {Function} onProgress - Callback with {current, total, score, qualityScore, isValid}
 * @returns {Promise<{descriptor: Float32Array, score: number, qualityScore: number} | null>}
 */
export async function extractBestDescriptorWithValidation(
  input,
  numSamples = 10, // Increased from 5 to 10 for deeper scanning
  delayMs = 500, // Increased from 400 to 500 for better stability
  onProgress
) {
  let bestDescriptor = null;
  let bestScore = 0;
  let bestQualityScore = 0;
  let validDetections = 0;
  const detectionDetails = [];

  // Clamp numSamples between reasonable bounds
  const clampedSamples = Math.min(15, Math.max(5, Math.round(numSamples)));

  console.log(`[FaceExtraction] Starting enhanced extraction with ${clampedSamples} samples...`);

  for (let i = 0; i < clampedSamples; i++) {
    try {
      const detection = await faceapi
        .detectSingleFace(input)
        .withFaceLandmarks()
        .withFaceDescriptor();

      const score = detection?.detection?.score ?? 0;
      
      // Enhanced validation with quality scoring
      const validation = isValidFaceDetection(detection, input);
      const qualityScore = validation.score;
      const isValid = validation.valid;

      detectionDetails.push({
        sampleNum: i + 1,
        confidence: (score * 100).toFixed(1),
        qualityScore: qualityScore.toFixed(1),
        isValid,
      });

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: clampedSamples,
          score: detection ? score : null,
          qualityScore,
          isValid,
          issues: validation.issues,
        });
      }

      // Select best descriptor based on BOTH confidence and quality score
      if (isValid && (score > bestScore || qualityScore > bestQualityScore)) {
        bestScore = score;
        bestQualityScore = qualityScore;
        bestDescriptor = detection?.descriptor;
        validDetections++;

        console.log(
          `[FaceExtraction] ✓ Better face found - Sample ${i + 1}: Confidence=${(score * 100).toFixed(1)}%, Quality=${qualityScore.toFixed(1)}%`
        );
      }

      // Wait between samples for better stability
      if (i < clampedSamples - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } catch (err) {
      console.error(`[FaceExtraction] Error in sample ${i + 1}:`, err.message);
      // Continue to next sample even if this one fails
    }
  }

  // Log summary
  console.log(`[FaceExtraction] Summary:`);
  console.log(`  Total samples: ${clampedSamples}`);
  console.log(`  Valid detections: ${validDetections}/${clampedSamples}`);
  console.log(`  Best confidence: ${(bestScore * 100).toFixed(1)}%`);
  console.log(`  Best quality score: ${bestQualityScore.toFixed(1)}/100`);
  console.group("[FaceExtraction] Detailed Results:");
  detectionDetails.forEach((detail) => {
    console.log(`  Sample ${detail.sampleNum}: Confidence=${detail.confidence}%, Quality=${detail.qualityScore}%, Valid=${detail.isValid}`);
  });
  console.groupEnd();

  if (bestDescriptor && bestScore >= MIN_CONFIDENCE && bestQualityScore >= 70) {
    return {
      descriptor: bestDescriptor,
      score: bestScore,
      qualityScore: bestQualityScore,
      validDetections,
      totalSamples: clampedSamples,
    };
  }

  console.warn(`[FaceExtraction] Failed: Best quality=${bestQualityScore.toFixed(1)}%, Valid=${validDetections > 0}`);
  return null;
}

/**
 * Capture a frame from video element and convert to base64 JPEG image
 * Used for storing profile picture during face registration
 * @param {HTMLVideoElement} videoElement - The video stream
 * @param {number} quality - JPEG quality (0-1, default 0.9)
 * @returns {Promise<string>} Base64 data URI string
 */
export async function captureVideoFrameAsBase64(videoElement, quality = 0.9) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth || videoElement.width || 640;
      canvas.height = videoElement.videoHeight || videoElement.height || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to base64 JPEG (more compressed than PNG)
      const base64 = canvas.toDataURL("image/jpeg", quality);
      resolve(base64);
    } catch (err) {
      reject(new Error(`Failed to capture frame: ${err.message}`));
    }
  });
}

/**
 * Draw face box and landmarks on canvas for visual feedback
 * Useful for showing user where their face was detected
 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
 * @param {Object} detection - face-api detection object with box and landmarks
 */
export function drawFaceDetection(canvas, detection) {
  if (!detection || !detection.detection) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { box } = detection.detection;

  // Draw face box
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Draw landmarks if available
  if (detection.landmarks && detection.landmarks.positions) {
    ctx.fillStyle = "#00ff00";
    detection.landmarks.positions.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

/**
 * Validate base64 image size
 * @param {string} base64 - Base64 data URI
 * @param {number} maxSizeMB - Maximum size in MB (default 2)
 * @returns {boolean}
 */
export function isValidImageSize(base64, maxSizeMB = 2) {
  // Remove data URI prefix
  const base64Data = base64.replace(/^data:image\/[^;]+;base64,/, "");
  const bytes = Buffer ? Buffer.from(base64Data, "base64").length : (base64Data.length * 3) / 4;
  const sizeMB = bytes / (1024 * 1024);
  return sizeMB <= maxSizeMB;
}

/**
 * Convert base64 data URI to Blob for sending as file
 * @param {string} base64 - Base64 data URI string
 * @returns {Blob}
 */
export function base64ToBlob(base64) {
  const [header, data] = base64.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mime });
}
