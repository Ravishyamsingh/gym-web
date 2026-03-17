const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const serverRoot = path.resolve(__dirname, "..");
const productionEnvPath = path.join(serverRoot, ".env");
const localEnvPath = path.join(serverRoot, ".env.local");

// Always load production env first
dotenv.config({ path: productionEnvPath });

// Then load local env (overrides production)
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

module.exports = {
  loadedFrom: fs.existsSync(localEnvPath) ? localEnvPath : productionEnvPath,
};
