import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { Search, X as XIcon, ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";

export default function AdminAttendance() {
  const { success, error: errorToast } = useToast();
  const [attendance, setAttendance] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchAttendance = async () => {
    try {
      setError(null);
      const { data } = await api.get("/attendance", {
        params: {
          all: true,
          q: searchQuery.trim() || undefined,
          date: dateFilter || undefined,
        },
      });
      setAttendance(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load attendance records");
      console.error("Fetch attendance error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [searchQuery, dateFilter]);

  const handleAttendanceExport = async () => {
    try {
      const response = await api.get("/reports/attendance-export", { responseType: "blob" });
      const contentType = response.headers?.["content-type"] || "";

      // Axios returns Blob even for error payloads when responseType is blob.
      // If backend sent JSON/text instead of xlsx, parse and surface it.
      if (!contentType.includes("spreadsheetml") && !contentType.includes("application/octet-stream")) {
        const raw = await response.data.text();
        let message = "Failed to export attendance report";
        try {
          const parsed = JSON.parse(raw);
          message = parsed.error || parsed.message || message;
        } catch {
          if (raw) message = raw;
        }
        throw new Error(message);
      }

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "om-muruga-olympia-fitness-attendance-report.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success("Attendance report exported successfully");
    } catch (err) {
      const message = err?.message || err?.response?.data?.error || "Failed to export attendance report";
      errorToast(message);
      console.error("Attendance export error:", err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Attendance History</h1>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleAttendanceExport}>
          <Download size={16} />
          Attendance Export
        </Button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ErrorState message={error} onRetry={fetchAttendance} />
        </motion.div>
      )}

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Search by name/email */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Search by member name or email…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full bg-surface border border-white/10 text-light placeholder-white/40 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blood transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>

        {/* Date filter */}
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
            }}
            className="w-full bg-surface border border-white/10 text-light placeholder-white/40 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blood transition-colors"
          />
          {dateFilter && (
            <button
              onClick={() => {
                setDateFilter("");
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase text-white/40">
                  <th className="py-3 pr-4">Member</th>
                  <th className="py-3 pr-4">Check-In Time</th>
                  <th className="py-3 pr-4">Check-Out Time</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-white/40">
                      Loading attendance records…
                    </td>
                  </tr>
                ) : attendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-white/40">
                      {searchQuery.trim() || dateFilter
                        ? "No records match your current filters."
                        : "No attendance records in the last 30 days. New records will appear here."}
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-light">{record.userId?.name || "Unknown"}</p>
                        <p className="text-xs text-white/40">{record.userId?.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-white/60">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 pr-4 text-white/60">
                        {record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-3 pr-4 text-white/60">
                        {new Date(record.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-white/60">
                        {record.durationMinutes ? `${record.durationMinutes} min` : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={record.sessionStatus === "in_gym" ? "pending" : "active"}>
                          {record.sessionStatus === "in_gym" ? "In Gym" : "Completed"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-white/40">
                Showing all {total} attendance records from the last 30 days
              </p>
              <p className="text-xs text-white/45">Older records are automatically removed after 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
