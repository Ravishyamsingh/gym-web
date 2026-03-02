import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { ShieldOff, ShieldCheck, Download, Edit2 } from "lucide-react";

export default function AdminMembers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingStatus, setEditingStatus] = useState("");

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data.users || []);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (userId) => {
    try {
      await api.put(`/users/${userId}/block`);
      fetchUsers(); // refresh list
    } catch (err) {
      console.error("Block toggle error:", err);
    }
  };

  const handleUpdatePaymentStatus = async (userId, newStatus) => {
    try {
      await api.put(`/users/${userId}/payment-status`, { paymentStatus: newStatus });
      setEditingUserId(null);
      fetchUsers(); // refresh list
    } catch (err) {
      console.error("Payment status update error:", err);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/reports/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "gymweb-report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
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

      <Card>
        <CardContent>
          {loading ? (
            <p className="text-sm text-white/40">Loading members…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-white/40">No members registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase text-white/40">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Payment</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Streak</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4 font-medium text-light">{u.name}</td>
                      <td className="py-3 pr-4 text-white/60">{u.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={u.paymentStatus === "active" ? "active" : u.paymentStatus === "pending" ? "pending" : "expired"}>
                          {u.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {u.isBlocked ? (
                          <Badge variant="blocked">Blocked</Badge>
                        ) : (
                          <Badge variant="active">Active</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-display text-lg font-bold">{u.currentStreak}</td>
                      <td className="py-3 text-right">
                        <Button
                          variant={u.isBlocked ? "outline" : "destructive"}
                          size="sm"
                          className="gap-1.5 hover:scale-105 transition-transform"
                          onClick={() => handleToggleBlock(u._id)}
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
