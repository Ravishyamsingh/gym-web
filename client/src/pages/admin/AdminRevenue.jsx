import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useToast } from "@/lib/useToast";
import {
  TrendingUp,
  Users,
  Calendar,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader,
} from "lucide-react";

const ITEMS_PER_PAGE = 15;

export default function AdminRevenue() {
  const { success, error: errorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [logs, setLogs] = useState(null);
  const [expiringUsers, setExpiringUsers] = useState(null);
  const [expiredUsers, setExpiredUsers] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);

      const [revRes, anaRes, distRes, logRes, expiringRes, expiredRes] = await Promise.all([
        api.get("/admin/revenue/summary"),
        api.get("/admin/revenue/analytics"),
        api.get("/admin/revenue/plan-distribution"),
        api.get(`/admin/revenue/membership-logs?page=1&limit=${ITEMS_PER_PAGE}&sortBy=${sortBy}&order=${sortOrder}`),
        api.get("/admin/revenue/expiry-alerts?daysFromNow=7&limit=10"),
        api.get("/admin/revenue/expiry-alerts?daysFromNow=-1&limit=10"),
      ]);

      setRevenue(revRes.data);
      setAnalytics(anaRes.data);
      setDistribution(distRes.data);
      setLogs(logRes.data);
      setExpiringUsers(expiringRes.data?.data || []);
      setExpiredUsers(expiredRes.data?.data || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to load revenue data";
      setError(errorMsg);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePageChange = async (newPage) => {
    try {
      const { data } = await api.get(
        `/admin/revenue/membership-logs?page=${newPage}&limit=${ITEMS_PER_PAGE}&sortBy=${sortBy}&order=${sortOrder}`
      );
      setLogs(data);
      setCurrentPage(newPage);
    } catch (err) {
      errorToast("Failed to load logs");
    }
  };

  const handleExportRevenue = async () => {
    try {
      const { data } = await api.get("/admin/revenue/membership-logs?limit=5000", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      success("Revenue data exported successfully");
    } catch (err) {
      errorToast("Failed to export data");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-blood" size={32} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Revenue Tracking</h1>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportRevenue}>
          <Download size={16} />
          Export Data
        </Button>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase">Total Revenue</p>
                  <p className="font-display text-2xl font-bold text-light mt-2">
                    ₹{revenue?.totalRevenue?.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40 mt-1">All-time</p>
                </div>
                <TrendingUp className="text-blood" size={32} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Registration Fee Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase">Registration Fees</p>
                <p className="font-display text-2xl font-bold text-blood mt-2">
                  ₹{revenue?.registrationFeeRevenue?.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {analytics?.metrics?.registrationFeePercentage}% of total
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Users */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase">Active Members</p>
                  <p className="font-display text-2xl font-bold text-light mt-2">
                    {analytics?.users?.active}
                  </p>
                  <p className="text-xs text-white/40 mt-1">Currently active</p>
                </div>
                <Users className="text-emerald-400" size={32} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Revenue per Activation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase">Avg per Activation</p>
                <p className="font-display text-2xl font-bold text-light mt-2">
                  ₹{analytics?.metrics?.avgRevenuePerActivation?.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {analytics?.metrics?.totalActivations} total activations
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Plan Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-light mb-4">Plan-wise Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {["1month", "3months", "6months", "1year"].map((plan) => {
                const data = distribution?.distribution[plan] || {};
                const planNames = {
                  "1month": "1 Month",
                  "3months": "3 Months",
                  "6months": "6 Months",
                  "1year": "12 Months",
                };

                return (
                  <div key={plan} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-light">{planNames[plan]}</h3>
                      <Badge variant="active">{data.count || 0}</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Revenue:</span>
                        <span className="text-blood font-mono font-bold">
                          ₹{(data.totalRevenue || 0).toLocaleString()}
                        </span>
                      </div>
                      {data.expiringSoon > 0 && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Expiring soon:</span>
                          <span className="text-orange-400 font-medium">{data.expiringSoon}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Membership Expiry Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expiring Soon */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-bold text-light mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-orange-400" />
                Expiring within 7 days
              </h2>
              {expiringUsers && expiringUsers.length > 0 ? (
                <div className="space-y-3">
                  {expiringUsers.map((user) => {
                    const daysLeft = Math.ceil((new Date(user.membershipExpiry) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={user._id} className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-light">{user.name}</p>
                            <p className="text-xs text-white/50">{user.email}</p>
                          </div>
                          <Badge variant="pending">{daysLeft} days</Badge>
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                          <span className="text-white/60">Plan: {user.membershipPlan}</span>
                          <span className="text-orange-400">Due: {new Date(user.membershipExpiry).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/40">No memberships expiring soon</p>
              )}
            </CardContent>
          </Card>

          {/* Recently Expired */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-bold text-light mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-blood" />
                Recently expired
              </h2>
              {expiredUsers && expiredUsers.length > 0 ? (
                <div className="space-y-3">
                  {expiredUsers.map((user) => {
                    const daysSinceExpiry = Math.ceil((new Date() - new Date(user.membershipExpiry)) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={user._id} className="p-3 bg-blood/10 border border-blood/30 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-light">{user.name}</p>
                            <p className="text-xs text-white/50">{user.email}</p>
                          </div>
                          <Badge variant="expired">Expired</Badge>
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                          <span className="text-white/60">Plan: {user.membershipPlan}</span>
                          <span className="text-blood">{daysSinceExpiry} day{daysSinceExpiry !== 1 ? 's' : ''} ago</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/40">No recently expired memberships</p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Recent Membership Activations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-light mb-4">Recent Membership Activations</h2>
            {logs?.data && logs.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs uppercase text-white/40">
                      <th className="py-3 pr-4">Member</th>
                      <th className="py-3 pr-4">Plan</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Reg Fee</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Expiry</th>
                      <th className="py-3 pr-4">Updated By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.data.map((log) => (
                      <tr key={log._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-light">{log.userId?.name || "N/A"}</p>
                            <p className="text-xs text-white/40">{log.userId?.email || ""}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="active">{log.membershipPlan}</Badge>
                        </td>
                        <td className="py-3 pr-4 font-mono font-bold text-blood">
                          ₹{log.totalAmount}
                        </td>
                        <td className="py-3 pr-4">
                          {log.registrationFeeIncluded ? (
                            <span className="text-xs bg-blood/20 text-blood px-2 py-1 rounded">
                              ₹{log.registrationFeeAmount}
                            </span>
                          ) : (
                            <span className="text-xs text-white/40">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-white/60">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-xs text-white/60">
                          {new Date(log.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          {log.adminId ? (
                            <span className="text-blood">{log.adminId.name}</span>
                          ) : (
                            <span className="text-white/40">System</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                  <p className="text-xs text-white/40">
                    Page {logs.pagination?.page} of {logs.pagination?.pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logs.pagination?.page === 1}
                      onClick={() => handlePageChange(logs.pagination.page - 1)}
                      className="gap-1"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logs.pagination?.page === logs.pagination?.pages}
                      onClick={() => handlePageChange(logs.pagination.page + 1)}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/40">No membership activations yet.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
