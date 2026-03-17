const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const serverRoot = path.resolve(__dirname, "..");
const productionEnvPath = path.join(serverRoot, ".env");
const localEnvPath = path.join(serverRoot, ".env.local");
const isProduction = process.env.NODE_ENV === "production";

const selectedEnvPath = !isProduction && fs.existsSync(localEnvPath)
  ? localEnvPath
  : productionEnvPath;

dotenv.config({ path: selectedEnvPath });

module.exports = {
  selectedEnvPath,
};
