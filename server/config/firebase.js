const admin = require("firebase-admin");
const path = require("path");

// ── Initialise Firebase Admin SDK ───────────
// The service-account JSON is gitignored; set its path in .env
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./config/serviceAccountKey.json";

// Resolve relative paths against the server/ directory (not CWD)
const resolvedPath = path.isAbsolute(serviceAccountPath)
  ? serviceAccountPath
  : path.resolve(path.join(__dirname, ".."), serviceAccountPath);

// Support providing the service account JSON directly via an env var
// (Railway and other hosts can store large JSON values as secrets).
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  let sa;
  try {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (err) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON — must be valid JSON');
    throw err;
  }

  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });
} else {
  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedPath)),
  });
}

module.exports = admin;
