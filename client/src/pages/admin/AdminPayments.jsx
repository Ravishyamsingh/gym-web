import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import api from "@/lib/api";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/payments");
        setPayments(data.payments || []);
      } catch (err) {
        console.error("Fetch payments error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Payments</h1>

      <Card>
        <CardContent>
          {loading ? (
            <p className="text-sm text-white/40">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-white/40">No payment records yet.</p>
          ) : (
            <div className="overflow-x-auto">
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
                            p.status === "paid" ? "active" : p.status === "pending" ? "pending" : "blocked"
                          }
                        >
                          {p.status}
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
