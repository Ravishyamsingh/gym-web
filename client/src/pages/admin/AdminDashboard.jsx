import { useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Users, Activity, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, liveNow: 0, blocked: 0 });
  const [liveAttendees, setLiveAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [usersRes, liveRes] = await Promise.all([
        api.get("/users"),
        api.get("/attendance/live"),
      ]);

      const users = usersRes.data.users || [];
      const attendees = liveRes.data.attendees || [];

      setStats({
        totalUsers: users.length,
        liveNow: attendees.length,
        blocked: users.filter((u) => u.isBlocked).length,
      });
      setLiveAttendees(attendees);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load + polling every 15 seconds for real-time feel
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Total Members", value: stats.totalUsers, icon: Users, color: "text-light" },
    { label: "Live in Gym", value: stats.liveNow, icon: Activity, color: "text-emerald-400" },
    { label: "Blocked", value: stats.blocked, icon: AlertTriangle, color: "text-blood" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Overview</h1>

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
        </CardTitle>
        <CardContent>
          {loading ? (
            <p className="text-sm text-white/40">Loading…</p>
          ) : liveAttendees.length === 0 ? (
            <p className="text-sm text-white/40">No one in the gym right now.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {liveAttendees.map((a) => (
                <div key={a._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-light">{a.userId?.name || "Unknown"}</p>
                    <p className="text-xs text-white/40">{a.userId?.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="active">In Gym</Badge>
                    <p className="mt-1 text-[10px] text-white/30">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </p>
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
