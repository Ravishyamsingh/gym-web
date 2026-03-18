import React, { useState } from "react";
import { testBackendPing, testBackendHealth } from "../lib/api";

export function DiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    const results = {};

    try {
      // Test 1: Backend ping
      console.log("\n=== DIAGNOSTIC TEST 1: Backend Ping ===");
      try {
        results.ping = await testBackendPing();
        console.log("✅ Ping successful");
      } catch (err) {
        results.ping = { error: err.message };
        console.error("❌ Ping failed", err);
      }

      // Test 2: Backend health
      console.log("\n=== DIAGNOSTIC TEST 2: Backend Health ===");
      try {
        results.health = await testBackendHealth();
        console.log("✅ Health check successful");
      } catch (err) {
        results.health = { error: err.message };
        console.error("❌ Health check failed", err);
      }

      // Test 3: API Configuration
      console.log("\n=== DIAGNOSTIC TEST 3: Configuration ===");
      results.config = {
        apiUrl: import.meta.env.VITE_API_URL || "not set",
        apiBase: import.meta.env.VITE_API_FALLBACK_URL || "not set",
        environment: import.meta.env.MODE,
        hostname: typeof window !== "undefined" ? window.location.hostname : "N/A",
      };
      console.log("Configuration:", results.config);

      // Test 4: Firebase config
      console.log("\n=== DIAGNOSTIC TEST 4: Firebase ===");
      try {
        const { auth } = await import("../lib/firebase");
        results.firebase = {
          configured: !!auth?.app?.options?.apiKey,
          apiKey: auth?.app?.options?.apiKey ? "***" : "missing",
          projectId: auth?.app?.options?.projectId || "missing",
          currentUser: auth?.currentUser?.email || "none",
        };
        console.log("Firebase status:", results.firebase);
      } catch (err) {
        results.firebase = { error: err.message };
        console.error("❌ Firebase check failed", err);
      }

      // Test 5: localStorage tokens
      console.log("\n=== DIAGNOSTIC TEST 5: Tokens ===");
      results.tokens = {
        jwtToken: localStorage.getItem("jwtToken") ? "present" : "missing",
        firebaseUser: typeof window !== "undefined" && !!require("../lib/firebase").auth?.currentUser ? "logged in" : "not logged in",
      };
      console.log("Token status:", results.tokens);

      setDiagnostics(results);
    } catch (err) {
      setError(err.message);
      console.error("Diagnostic error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">🔧 Diagnostics Panel</h3>

      <button
        onClick={runDiagnostics}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Full Diagnostics"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {diagnostics && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h4 className="font-bold mb-2">📊 Results Summary</h4>
            <div className="space-y-2 font-mono text-sm">
              <div>
                Backend Ping:{" "}
                <span className={diagnostics.ping.error ? "text-red-600" : "text-green-600"}>
                  {diagnostics.ping.error ? `❌ ${diagnostics.ping.error}` : "✅ OK"}
                </span>
              </div>
              <div>
                Health Check:{" "}
                <span className={diagnostics.health.error ? "text-red-600" : "text-green-600"}>
                  {diagnostics.health.error ? `❌ ${diagnostics.health.error}` : "✅ OK"}
                </span>
              </div>
              <div>
                Firebase:{" "}
                <span className={diagnostics.firebase.error ? "text-red-600" : "text-green-600"}>
                  {diagnostics.firebase.error ? `❌ ${diagnostics.firebase.error}` : "✅ Configured"}
                </span>
              </div>
              <div>
                JWT Token:{" "}
                <span className={diagnostics.tokens.jwtToken === "present" ? "text-green-600" : "text-yellow-600"}>
                  {diagnostics.tokens.jwtToken}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <h4 className="font-bold mb-2">🔍 Full Details</h4>
            <pre className="text-xs overflow-auto max-h-64 p-2 bg-white rounded border">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-bold mb-2">💡 Next Steps:</p>
            <ul className="list-disc list-inside space-y-1">
              {diagnostics.ping.error && (
                <li>Backend is not reachable. Check Render deployment logs.</li>
              )}
              {diagnostics.firebase.error && (
                <li>Firebase configuration issue. Check firebaseConfig in lib/firebase.js</li>
              )}
              {diagnostics.tokens.jwtToken === "missing" && !diagnostics.firebase.configured && (
                <li>No authentication tokens found. Please login first.</li>
              )}
              {!diagnostics.ping.error && diagnostics.health.services?.email === "operational" && (
                <li>✅ Backend and email service operational. Ready for OTP testing.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiagnosticsPanel;
