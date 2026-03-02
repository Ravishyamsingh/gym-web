import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";

export default function AdminSettings() {
  const { dbUser } = useAuth();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Settings</h1>

      <Card>
        <CardTitle>Admin Profile</CardTitle>
        <CardContent className="space-y-3 mt-2">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Name</p>
            <p className="text-light font-medium">{dbUser?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Email</p>
            <p className="text-light font-medium">{dbUser?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Role</p>
            <p className="text-light font-medium uppercase">{dbUser?.role || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardTitle>Admin Access Control</CardTitle>
        <CardContent className="mt-2 space-y-3">
          <div>
            <p className="text-sm text-white/50 mb-2">
              Admin access is restricted to users with the email configured in the <code className="text-blood">ADMIN_EMAIL</code> environment variable.
            </p>
            <p className="text-xs text-white/40">
              Only users who register with the admin email will have access to the admin panel. Regular users can only access their personal dashboard and facial verification.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardTitle>Admin Capabilities</CardTitle>
        <CardContent className="mt-2">
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>View all members and their profiles</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>Block/unblock user accounts</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>Manage payment status (active, pending, expired)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>View live attendance (last 3 hours)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>View complete attendance history</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>Manage payment records</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blood">•</span>
              <span>Export reports to Excel</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardTitle>User Profile Completion</CardTitle>
        <CardContent className="mt-2">
          <p className="text-sm text-white/50 mb-2">
            New users must complete their profile by capturing a baseline facial scan before accessing the dashboard.
          </p>
          <p className="text-xs text-white/40">
            After registration, users are redirected to the profile completion page where they capture their face. This face descriptor is used for all future facial recognition verifications.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
