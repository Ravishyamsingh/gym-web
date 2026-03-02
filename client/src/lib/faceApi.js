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
 * Compare two face descriptors using Euclidean distance.
 * @param {Float32Array | number[]} d1
 * @param {Float32Array | number[]} d2
 * @param {number} threshold  — default 0.6 (lower = stricter)
 * @returns {{ match: boolean, distance: number }}
 */
export function compareDescriptors(d1, d2, threshold = 0.6) {
  const distance = faceapi.euclideanDistance(d1, d2);
  return { match: distance < threshold, distance };
}
