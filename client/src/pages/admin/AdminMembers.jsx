import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useToast } from "@/lib/useToast";
import MembershipDialog from "@/components/admin/MembershipDialog";
import { ShieldOff, ShieldCheck, Download, Edit2, Search, X as XIcon, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export default function AdminMembers() {
  const { success, error: errorToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, userId: null, action: null });
  const [membershipDialog, setMembershipDialog] = useState({ isOpen: false, user: null });

  const fetchUsers = async () => {
    try {
      setError(null);
      const { data } = await api.get("/users");
      setUsers(data.users || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to load members";
      setError(errorMsg);
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (userId, currentState) => {
    try {
      setUpdatingId(userId);
      await api.put(`/users/${userId}/block`);
      success(currentState ? "Member unblocked" : "Member blocked");
      setConfirmDialog({ isOpen: false, type: null, userId: null, action: null });
      fetchUsers();
    } catch (err) {
      errorToast("Failed to update member status");
      console.error("Block toggle error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const openBlockConfirm = (userId, isCurrentlyBlocked, userName) => {
    setConfirmDialog({
      isOpen: true,
      type: "block",
      userId,
      action: isCurrentlyBlocked ? "unblock" : "block",
      userName,
      isCurrentlyBlocked,
    });
  };

  const openMembershipDialog = (user) => {
    setMembershipDialog({ isOpen: true, user });
  };

  const closeMembershipDialog = () => {
    setMembershipDialog({ isOpen: false, user: null });
  };

  const handleMembershipSuccess = (message) => {
    success(message);
    fetchUsers();
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/reports/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "om-muruga-olympia-fitness-report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      success("Report exported successfully");
    } catch (err) {
      errorToast("Failed to export report");
      console.error("Export error:", err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Members</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 hover:scale-105 transition-transform"
          onClick={handleExport}
        >
          <Download size={16} />
          Export Excel
        </Button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ErrorState message={error} onRetry={fetchUsers} />
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        <input
          type="text"
          placeholder="Search by name, email, or user ID…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset to first page on search
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
            <p className="text-sm text-white/40">Loading members…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-white/40">No members registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const filtered = users.filter((u) =>
                  (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (u.userId || "").toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-white/40 text-sm">
                      No members match "{searchQuery}"
                    </div>
                  );
                }

                const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
                const paginatedUsers = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

                return (
                  <>
                    <table className="w-full text-left text-sm" style={{ minWidth: "1000px" }}>
                      <thead>
                      <tr className="border-b border-white/5 text-xs uppercase text-white/40">
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">Name</th>
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">Email</th>
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">User ID</th>
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">Membership</th>
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">Plan</th>
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">Expiry</th>
                        <th className="py-3 pr-4 whitespace-nowrap min-w-max">Streak</th>
                        <th className="py-3 text-right whitespace-nowrap min-w-max">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedUsers.map((u) => (
                        <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4 font-medium text-light whitespace-nowrap min-w-max">{u.name}</td>
                      <td className="py-3 pr-4 text-white/60 text-sm whitespace-nowrap min-w-max">{u.email}</td>
                      <td className="py-3 pr-4 text-white/60 font-mono text-xs whitespace-nowrap min-w-max">{u.userId || "—"}</td>
                      <td className="py-3 pr-4 whitespace-nowrap min-w-max">
                        <Badge
                          variant={
                            u.paymentStatus === "active"
                              ? "active"
                              : u.paymentStatus === "pending"
                              ? "pending"
                              : "expired"
                          }
                        >
                          {u.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap min-w-max">
                        <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">
                          {u.membershipPlan || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-white/60 whitespace-nowrap min-w-max">
                        {u.membershipExpiry
                          ? new Date(u.membershipExpiry).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 font-display text-lg font-bold text-blood whitespace-nowrap min-w-max">{u.currentStreak}</td>
                      <td className="py-3 text-right flex items-center justify-end gap-2 whitespace-nowrap min-w-max">
                        <button
                          onClick={() => openMembershipDialog(u)}
                          className="p-1.5 bg-blood/10 hover:bg-blood/20 border border-blood/30 rounded-lg transition text-blood disabled:opacity-50"
                          disabled={updatingId === u._id}
                          title="Update membership"
                        >
                          <Edit2 size={16} />
                        </button>
                        <Button
                          variant={u.isBlocked ? "outline" : "destructive"}
                          size="sm"
                          disabled={updatingId === u._id}
                          className="gap-1.5 hover:scale-105 transition-transform disabled:opacity-50"
                          onClick={() => openBlockConfirm(u._id, u.isBlocked, u.name)}
                        >
                          {u.isBlocked ? (
                            <>
                              <ShieldCheck size={14} />
                              Unblock
                            </>
                          ) : (
                            <>
                              <ShieldOff size={14} />
                              Block
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                    </tbody>
                  </table>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                      <p className="text-xs text-white/40">
                        Showing {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} members
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
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        variant={confirmDialog.action === "block" ? "danger" : "warn"}
        title={confirmDialog.action === "block" ? "Block Member?" : "Unblock Member?"}
        message={
          confirmDialog.action === "block"
            ? `This will prevent ${confirmDialog.userName} from accessing the gym. They won't be able to check in.`
            : `${confirmDialog.userName} will regain access to check in with facial recognition.`
        }
        confirmText={confirmDialog.action === "block" ? "Block" : "Unblock"}
        isPending={updatingId === confirmDialog.userId}
        onConfirm={() => handleToggleBlock(confirmDialog.userId, confirmDialog.isCurrentlyBlocked)}
        onCancel={() => setConfirmDialog({ isOpen: false, type: null, userId: null, action: null })}
      />

      {/* Membership Dialog */}
      <MembershipDialog
        isOpen={membershipDialog.isOpen}
        user={membershipDialog.user}
        onClose={closeMembershipDialog}
        onSuccess={handleMembershipSuccess}
      />
    </motion.div>
  );
}
