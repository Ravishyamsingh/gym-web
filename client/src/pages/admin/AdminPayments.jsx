import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Search, X as XIcon, ChevronLeft, ChevronRight, IndianRupee, TrendingUp, CheckCircle } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPayments = async () => {
    try {
      setError(null);
      const { data } = await api.get("/payments", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          q: searchQuery.trim() || undefined,
        },
      });
      setPayments(data.payments || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load payments");
      console.error("Fetch payments error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/payments/stats/summary");
      setStats(data.stats || {
        totalRevenue: 0,
        pendingAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        failedCount: 0,
      });
    } catch (err) {
      console.error("Fetch payment stats error:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [currentPage, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Payments</h1>

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
              fetchPayments();
            }}
          />
        </motion.div>
      )}

      {/* Statistics Cards */}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {/* Total Revenue */}
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
                <IndianRupee size={24} />
              </div>
              <div>
                <p className="text-sm text-white/50">Total Revenue</p>
                <p className="font-display text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Amount */}
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-yellow-500/10 p-3 text-yellow-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-white/50">Pending</p>
                <p className="font-display text-2xl font-bold">₹{stats.pendingAmount.toLocaleString()}</p>
                <p className="text-xs text-white/40">{stats.pendingCount} transactions</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Summary */}
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-blood/10 p-3 text-blood">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-white/50">Payment Status</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="active">{stats.paidCount} Paid</Badge>
                  <Badge variant="pending">{stats.pendingCount} Pending</Badge>
                  <Badge variant="blocked">{stats.failedCount} Failed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        <input
          type="text"
          placeholder="Search by member name or email…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-surface border border-white/10 text-light placeholder-white/40 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blood transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
          >
            <XIcon size={18} />
          </button>
        )}
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <p className="text-sm text-white/40">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-white/40">
              {searchQuery.trim() ? `No payments match "${searchQuery}".` : "No payment records yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <>
                <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-xs uppercase text-white/40">
                          <th className="py-3 pr-4">Member</th>
                          <th className="py-3 pr-4">Amount</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 pr-4">Paid On</th>
                          <th className="py-3">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {payments.map((p) => (
                          <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-light">{p.userId?.name || "N/A"}</p>
                              <p className="text-xs text-white/40">{p.userId?.email}</p>
                            </td>
                            <td className="py-3 pr-4 font-display text-lg font-bold">₹{p.amount}</td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant={
                                  p.status === "paid" 
                                    ? "active" 
                                    : p.status === "pending" 
                                    ? "pending" 
                                    : p.status === "cancelled"
                                    ? "outline"
                                    : "blocked"
                                }
                              >
                                {p.status === "cancelled" ? "Superseded" : p.status}
                              </Badge>
                            </td>
                      <td className="py-3 pr-4 text-white/60">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—"}
                      </td>
                            <td className="py-3 text-white/60">
                              {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                </table>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                      <p className="text-xs text-white/40">
                        Showing {total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} payments
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="gap-1"
                        >
                          <ChevronLeft size={16} />
                          Previous
                        </Button>
                        <span className="text-sm text-white/60 px-2">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="gap-1"
                        >
                          Next
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </div>
              </>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
