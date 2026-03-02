const admin = require("firebase-admin");
const path = require("path");

// ── Initialise Firebase Admin SDK ───────────
// The service-account JSON is gitignored; set its path in .env
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./config/serviceAccountKey.json";

// Resolve relative paths against the server/ directory (not CWD)
const resolvedPath = path.isAbsolute(serviceAccountPath)
  ? serviceAccountPath
  : path.resolve(path.join(__dirname, ".."), serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(require(resolvedPath)),
});

module.exports = admin;
