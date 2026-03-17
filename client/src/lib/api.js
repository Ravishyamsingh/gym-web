import axios from "axios";
import { auth } from "./firebase";

const apiOrigin = import.meta.env.VITE_API_URL?.trim();
const fallbackApiOrigin = (import.meta.env.VITE_API_FALLBACK_URL?.trim() || "https://olympia-fitness.onrender.com")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const enableDirectApiFallback = String(import.meta.env.VITE_ENABLE_DIRECT_API_FALLBACK || "false").toLowerCase() === "true";
const normalizedApiOrigin = apiOrigin
  ? apiOrigin.replace(/\/+$/, "").replace(/\/api$/i, "")
  : "";

const isBrowser = typeof window !== "undefined";
const isLocalHostRuntime = isBrowser
  ? ["localhost", "127.0.0.1"].includes(window.location.hostname)
  : false;
const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedApiOrigin);

// On live domains, never allow localhost API origin.
// Fallback to same-origin /api (Netlify proxy in production, Vite proxy in local).
const baseURL = (!isLocalHostRuntime && pointsToLocalhost)
  ? "/api"
  : (normalizedApiOrigin ? `${normalizedApiOrigin}/api` : "/api");

const api = axios.create({
  baseURL,
  timeout: 45000,
});

const PUBLIC_AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/check-user",
];

function isPublicAuthRoute(url = "") {
  return PUBLIC_AUTH_ROUTES.some((route) => url.startsWith(route));
}

function isAuthOrSessionRoute(url = "") {
  return (
    url.startsWith("/auth/") ||
    url.startsWith("auth/") ||
    url.startsWith("/users/me") ||
    url.startsWith("users/me")
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Attach the Firebase ID-token OR JWT token to every outgoing request
api.interceptors.request.use(
  async (config) => {
    config.__startTime = Date.now();
    const requestUrl = String(config?.url || "");

    // Public auth routes should never require auth headers.
    if (isPublicAuthRoute(requestUrl)) {
      return config;
    }

    // Respect explicit Authorization headers provided by the caller.
    if (config?.headers?.Authorization) {
      return config;
    }

    config.headers = config.headers || {};

    // Prefer Firebase token when a Firebase session exists.
    // This avoids stale JWTs overriding OAuth/admin sessions.
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(true); // Force refresh for fresh token
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (err) {
        // Do not block requests if Firebase token refresh fails.
        // Fallback to JWT below if available.
        console.warn("Failed to refresh Firebase ID token; falling back to JWT when available:", err?.code || err?.message || err);
      }
    }

    // Fallback to JWT token (password-based auth)
    const jwtToken = localStorage.getItem("jwtToken");
    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Log API response errors for debugging
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const canRetryViaProxy =
      !isLocalHostRuntime &&
      typeof window !== "undefined" &&
      baseURL === "/api" &&
      isAuthOrSessionRoute(requestUrl) &&
      !error?.config?.__retriedViaProxy;

    // First retry same-origin through Netlify/Vite proxy to avoid CORS issues.
    if (status === 504 && canRetryViaProxy) {
      console.warn("[API] 504 timeout on /api proxy, retrying after brief delay...");
      await delay(300);
      const retryConfig = {
        ...error.config,
        __retriedViaProxy: true,
        baseURL: "/api",
      };
      return api.request(retryConfig);
    }

    const canRetryViaDirectOrigin =
      enableDirectApiFallback &&
      status === 504 &&
      !isLocalHostRuntime &&
      typeof window !== "undefined" &&
      baseURL === "/api" &&
      isAuthOrSessionRoute(requestUrl) &&
      error?.config?.__retriedViaProxy &&
      !error?.config?.__retriedViaDirectOrigin;

    if (canRetryViaDirectOrigin) {
      const retryConfig = {
        ...error.config,
        __retriedViaDirectOrigin: true,
        baseURL: `${fallbackApiOrigin}/api`,
      };
      return api.request(retryConfig);
    }

    if (error.response?.status === 429) {
      console.warn("Rate limit 429 - Too many requests:", {
        url: error.config?.url,
        retryAfter: error.response?.headers?.['retry-after'],
      });
    } else if (error.response?.status === 500) {
      console.error("Server error 500 - API call failed:", {
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
        message: error.response?.data?.error,
      });
    } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      console.warn("Request timeout:", {
        url: error.config?.url,
        timeout: error.config?.timeout,
        elapsed: Date.now() - (error.config?.__startTime || 0),
      });
    }
    return Promise.reject(error);
  }
);

export default api;
