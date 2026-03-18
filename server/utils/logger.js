/**
 * ═══════════════════════════════════════════════════════════════════
 * Structured Logger Utility for Production
 * ═══════════════════════════════════════════════════════════════════
 */

const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

/**
 * Production-ready structured logger
 * Outputs JSON for easy parsing in log aggregation services (CloudWatch, DataDog, etc)
 */
class Logger {
  constructor(moduleName = "App") {
    this.moduleName = moduleName;
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * Format log as JSON for production, readable for development
   */
  formatLog(level, message, data = {}, error = null) {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      module: this.moduleName,
      message,
      ...data,
      ...(error && { error: this.formatError(error) }),
    };

    if (this.isDevelopment) {
      // Development: Pretty print with emojis
      const emoji = this.getEmoji(level);
      console.log(`${emoji} [${timestamp}] ${level.toUpperCase()} - ${message}`, data);
      if (error) console.error(error);
    } else {
      // Production: Stderr for errors, stdout for others
      const outputStream = level === LOG_LEVELS.ERROR ? console.error : console.log;
      outputStream(JSON.stringify(logObject));
    }
  }

  formatError(error) {
    if (this.isDevelopment) return error.message; // Dev: Just message
    // Production: Full context without sensitive data
    return {
      type: error.constructor.name,
      message: error.message,
      code: error.code || null,
    };
  }

  getEmoji(level) {
    const emojis = {
      error: "❌",
      warn: "⚠️ ",
      info: "ℹ️ ",
      debug: "🐛",
    };
    return emojis[level] || "📍";
  }

  error(message, data = {}, error = null) {
    this.formatLog(LOG_LEVELS.ERROR, message, data, error);
  }

  warn(message, data = {}) {
    this.formatLog(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = {}) {
    this.formatLog(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = {}) {
    if (this.isDevelopment) {
      this.formatLog(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

module.exports = Logger;
