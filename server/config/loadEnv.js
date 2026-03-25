const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const serverRoot = path.resolve(__dirname, "..");
const envPath = path.join(serverRoot, ".env");

console.log(`[ENV] Loading environment from: ${envPath}`);

// Load ONLY .env file (ignore .env.local and other variations)
const result = dotenv.config({ path: envPath });

if (result.error) {
  if (result.error.code !== 'ENOENT') {
    console.error(`[ENV] ❌ Error loading .env:`, result.error.message);
  }
} else if (result.parsed) {
  console.log(`[ENV] ✅ Loaded ${Object.keys(result.parsed).length} variables from .env`);
} else {
  console.warn(`[ENV] ⚠️ No variables loaded from .env`);
}

// Verify critical variables
const criticalVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'MONGO_URI', 'JWT_SECRET'];
const missingVars = criticalVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.warn(`[ENV] ⚠️ Missing critical variables: ${missingVars.join(', ')}`);
}

module.exports = {
  loadedFrom: envPath,
};
