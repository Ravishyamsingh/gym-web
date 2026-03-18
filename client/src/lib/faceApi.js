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
 * Minimum detection confidence to consider a face capture reliable.
 */
const MIN_CONFIDENCE = 0.85;

/**
 * Stricter threshold for face matching (lower = more strict)
 * 0.6 was too loose and allowed different faces to match
 * 0.45 provides better accuracy while still allowing minor variations
 */
const FACE_MATCH_THRESHOLD = 0.45;

/**
 * Minimum face size (in pixels) to consider valid
 * Prevents matching against very small/distant faces
 */
const MIN_FACE_SIZE = 80;

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
 * Validate face detection quality and size
 * @param {Object} detection - face-api detection object
 * @returns {boolean} true if face is valid
 */
export function isValidFaceDetection(detection) {
  if (!detection || !detection.detection) return false;
  
  const { score, box } = detection.detection;
  
  // Check confidence score
  if (score < MIN_CONFIDENCE) {
    console.warn(`Face confidence too low: ${score} < ${MIN_CONFIDENCE}`);
    return false;
  }
  
  // Check face size (width and height)
  const faceWidth = box.width;
  const faceHeight = box.height;
  
  if (faceWidth < MIN_FACE_SIZE || faceHeight < MIN_FACE_SIZE) {
    console.warn(`Face too small: ${faceWidth}x${faceHeight} < ${MIN_FACE_SIZE}`);
    return false;
  }
  
  // Check for landmarks (68 points should be detected)
  if (!detection.landmarks || detection.landmarks.positions.length < 68) {
    console.warn("Insufficient facial landmarks detected");
    return false;
  }
  
  return true;
}

/**
 * Extract best descriptor with enhanced validation
 * @param {HTMLVideoElement} input
 * @param {number} numSamples
 * @param {number} delayMs
 * @param {Function} onProgress
 * @returns {Promise<{descriptor: Float32Array, score: number} | null>}
 */
export async function extractBestDescriptorWithValidation(input, numSamples = 5, delayMs = 400, onProgress) {
  let bestDescriptor = null;
  let bestScore = 0;
  let validDetections = 0;

  for (let i = 0; i < numSamples; i++) {
    const detection = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();

    const score = detection?.detection?.score ?? 0;
    const isValid = isValidFaceDetection(detection);

    if (onProgress) {
      onProgress({ 
        current: i + 1, 
        total: numSamples, 
        score: detection ? score : null,
        isValid 
      });
    }

    if (isValid && score > bestScore) {
      bestScore = score;
      bestDescriptor = detection.descriptor;
      validDetections++;
    }

    if (i < numSamples - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  console.log(`[Face Extraction] Valid detections: ${validDetections}/${numSamples}, Best score: ${bestScore.toFixed(4)}`);

  return bestDescriptor ? { descriptor: bestDescriptor, score: bestScore } : null;
}
