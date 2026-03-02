import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import UserLayout from "@/components/layout/UserLayout";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Flame, CalendarDays, ScanFace } from "lucide-react";

/** Animated counter that counts up from 0 → value */
function CountUp({ to, duration = 1.5 }) {
  const ref = useRef(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionVal, to, { duration });
    return () => controls.stop();
  }, [to, duration, motionVal]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
  }, [rounded]);

  return <span ref={ref}>0</span>;
}

export default function UserDashboard() {
  const { dbUser } = useAuth();

  const statusVariant =
    dbUser?.paymentStatus === "active"
      ? "active"
      : dbUser?.paymentStatus === "pending"
      ? "pending"
      : "expired";

  return (
    <UserLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-lg space-y-6"
      >
        {/* Greeting */}
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            {dbUser?.name || "Member"}
          </h1>
          <p className="mt-1 text-sm text-white/40 flex items-center gap-1.5">
            <CalendarDays size={14} />
            Joined {dbUser?.joinDate ? new Date(dbUser.joinDate).toLocaleDateString() : "—"}
          </p>
        </div>

        {/* Status badge */}
        <Badge variant={statusVariant} className="text-xs">
          Membership: {dbUser?.paymentStatus || "—"}
        </Badge>

        {/* Streak card */}
        <Card>
          <CardTitle className="flex items-center gap-2">
            <Flame size={20} className="text-blood animate-pulse-red" />
            Attendance Streak
          </CardTitle>
          <CardContent>
            <span className="font-display text-6xl font-bold text-light">
              <CountUp to={dbUser?.currentStreak || 0} />
            </span>
            <span className="ml-2 text-lg text-white/40">days</span>
          </CardContent>
        </Card>

        {/* Verify Face — primary CTA */}
        <Link to="/verify" className="block">
          <Button size="xl" className="w-full gap-3 text-lg">
            <ScanFace size={24} />
            Verify Face & Enter
          </Button>
        </Link>

        {dbUser?.isBlocked && (
          <div className="rounded-xl border border-blood/30 bg-blood/10 px-4 py-3 text-center text-sm text-blood">
            Your account is currently blocked. Please contact the front desk.
          </div>
        )}
      </motion.div>
    </UserLayout>
  );
}
