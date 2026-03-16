import { useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Users, Activity, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, liveNow: 0, blocked: 0 });
  const [liveAttendees, setLiveAttendees] = useState([]);
  const [longSessionAlerts, setLongSessionAlerts] = useState(0);
  const [alertThresholdMinutes, setAlertThresholdMinutes] = useState(240);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const statsRes = await api.get("/users/admin/stats");
      const nextStats = statsRes.data?.stats || { totalUsers: 0, blocked: 0 };
      setStats((prev) => ({ ...prev, ...nextStats }));
    } catch (err) {
      console.error("Dashboard stats fetch error:", err);
      setError(err.response?.data?.error || "Failed to load dashboard stats");
    }
  };

  const fetchLiveAttendees = async () => {
    try {
      setError(null);
      const liveRes = await api.get("/attendance/live");
      const attendees = liveRes.data.attendees || [];
      const alerts = liveRes.data.longSessionAlerts || 0;
      const threshold = liveRes.data.alertThresholdMinutes || 240;

      setLiveAttendees(attendees);
      setLongSessionAlerts(alerts);
      setAlertThresholdMinutes(threshold);
      setStats((prev) => ({ ...prev, liveNow: attendees.length }));
    } catch (err) {
      console.error("Dashboard live fetch error:", err);
      setError(err.response?.data?.error || "Failed to load live attendees");
    } finally {
      setLoading(false);
    }
  };

  // Initial load + separate polling cadences
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([fetchStats(), fetchLiveAttendees()]);
    };

    initialize();

    const liveInterval = setInterval(fetchLiveAttendees, 15000);
    const statsInterval = setInterval(fetchStats, 60000);
    return () => {
      clearInterval(liveInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const statCards = [
    { label: "Total Members", value: stats.totalUsers, icon: Users, color: "text-light" },
    { label: "Live in Gym", value: stats.liveNow, icon: Activity, color: "text-emerald-400" },
    { label: "Blocked", value: stats.blocked, icon: AlertTriangle, color: "text-blood" },
  ];

  const visibleAttendees = showAlertsOnly
    ? liveAttendees.filter((a) => a.hasLongSessionAlert)
    : liveAttendees;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Overview</h1>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ErrorState
            message={error}
            onRetry={() => {
              fetchStats();
              fetchLiveAttendees();
            }}
          />
        </motion.div>
      )}

      {/* ── Stat cards ──────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className={`rounded-lg bg-white/5 p-3 ${color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm text-white/50">{label}</p>
                <p className="font-display text-2xl font-bold">{loading ? "—" : value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Live attendees feed ──────────── */}
      <Card>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Live Attendees
          {longSessionAlerts > 0 && (
            <Badge variant="pending" className="ml-2">
              {longSessionAlerts} Long Session Alert{longSessionAlerts > 1 ? "s" : ""}
            </Badge>
          )}
          <span className="ml-auto text-[11px] font-medium uppercase tracking-wider text-white/40">
            Alert after {alertThresholdMinutes}m
          </span>
        </CardTitle>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-white/45">
              Monitoring possible missed exits based on long active sessions.
            </p>
            <button
              onClick={() => setShowAlertsOnly((prev) => !prev)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                showAlertsOnly
                  ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-300"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
              }`}
            >
              {showAlertsOnly ? "Showing Alerts" : "Show Alerts Only"}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-white/40">Loading…</p>
          ) : visibleAttendees.length === 0 ? (
            <p className="text-sm text-white/40">No one in the gym right now.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {visibleAttendees.map((a) => (
                <div key={a._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-light">{a.userId?.name || "Unknown"}</p>
                    <p className="text-xs text-white/40">{a.userId?.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={a.hasLongSessionAlert ? "pending" : "active"}>
                      {a.hasLongSessionAlert ? "Alert" : "In Gym"}
                    </Badge>
                    <p className="mt-1 text-[10px] text-white/30">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </p>
                    {a.hasLongSessionAlert && (
                      <p className="mt-1 text-[10px] text-yellow-300/80">
                        {a.durationMinutes} min - possible missed exit
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
