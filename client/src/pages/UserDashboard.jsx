import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import UserLayout from "@/components/layout/UserLayout";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Flame,
  CalendarDays,
  ScanFace,
  CreditCard,
  TrendingUp,
  Clock,
  User,
  Mail,
  Shield,
  Activity,
  BarChart3,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Calendar,
  Dumbbell,
} from "lucide-react";

/* ================================================================
   HELPERS
   ================================================================ */

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

function formatPlanName(plan) {
  if (plan === "1month") return "1 Month";
  if (plan === "6months") return "6 Months";
  if (plan === "1year") return "1 Year";
  return "—";
}

function formatDate(d, opts) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", opts || { year: "numeric", month: "short", day: "numeric" });
}

function useMembershipProgress(startDate, expiryDate) {
  return useMemo(() => {
    if (!startDate || !expiryDate)
      return { daysRemaining: 0, totalDays: 0, progress: 0, isExpiringSoon: false, isExpired: true };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.ceil((expiry - start) / 86400000));
    const daysRemaining = Math.max(0, Math.ceil((expiry - now) / 86400000));
    const elapsed = totalDays - daysRemaining;
    const progress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
    return {
      daysRemaining,
      totalDays,
      progress,
      isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
      isExpired: daysRemaining <= 0,
    };
  }, [startDate, expiryDate]);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/* ================================================================
   ANIMATIONS
   ================================================================ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

/* ================================================================
   PROGRESS RING
   ================================================================ */

function ProgressRing({ progress, size = 140, strokeWidth = 8, children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  const color = progress >= 90 ? "#ef4444" : progress >= 70 ? "#eab308" : "#22c55e";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ================================================================
   MINI BAR CHART — 6-month overview
   ================================================================ */

function MonthCards({ data }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {data.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          className="bg-white/[0.04] border border-white/10 rounded-xl p-3 sm:p-4 text-center hover:border-blood/30 hover:bg-white/[0.06] transition-all duration-300"
        >
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{d.label}</p>
          <p className="text-2xl sm:text-3xl font-bold font-display text-white mt-1.5">{d.count}</p>
          <p className="text-xs text-white/55 mt-0.5">visits</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================
   GITHUB-STYLE ATTENDANCE HEATMAP — last 6 months
   ================================================================ */

function AttendanceHeatmap({ records }) {
  const [tooltip, setTooltip] = useState(null);

  const attendedDates = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      const d = new Date(r.timestamp);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    });
    return set;
  }, [records]);

  const { months, totalAttended } = useMemo(() => {
    const now = new Date();
    const months = [];
    let totalAttended = 0;

    for (let m = 5; m >= 0; m--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const days = [];
      let monthAttended = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const attended = attendedDates.has(key);
        const isFuture = date > now;
        if (attended) { monthAttended++; totalAttended++; }
        days.push({ date, key, day: d, dayOfWeek: date.getDay(), attended, isFuture });
      }

      const weeks = [];
      let currentWeek = new Array(7).fill(null);
      days.forEach((dayObj) => {
        const idx = dayObj.dayOfWeek === 0 ? 6 : dayObj.dayOfWeek - 1;
        currentWeek[idx] = dayObj;
        if (idx === 6) { weeks.push(currentWeek); currentWeek = new Array(7).fill(null); }
      });
      if (currentWeek.some((c) => c !== null)) weeks.push(currentWeek);

      months.push({ label: MONTH_SHORT[month], year, month, weeks, attended: monthAttended, total: daysInMonth });
    }
    return { months, totalAttended };
  }, [attendedDates]);

  const getCellColor = useCallback((day) => {
    if (!day) return "bg-transparent";
    if (day.isFuture) return "bg-white/[0.03]";
    if (day.attended) return "bg-emerald-500";
    return "bg-white/[0.06]";
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-emerald-400" />
          <span className="text-base font-semibold text-white">Attendance Heatmap</span>
        </div>
        <span className="text-sm text-white/70 font-medium">{totalAttended} days total</span>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="inline-flex gap-4 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] pt-[20px] shrink-0">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-[14px] flex items-center">
                <span className="text-xs text-white/55 w-8 text-right pr-1">{label}</span>
              </div>
            ))}
          </div>

          {months.map((m) => (
            <div key={`${m.year}-${m.month}`} className="flex flex-col shrink-0">
              <div className="text-xs text-white/65 mb-1.5 text-center font-medium">{m.label}</div>
              <div className="flex gap-[3px]">
                {m.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-[14px] h-[14px] rounded-[3px] transition-all duration-200 relative ${getCellColor(day)} ${
                          day && !day.isFuture ? "hover:ring-1 hover:ring-white/30 hover:scale-125 cursor-default" : ""
                        }`}
                        onMouseEnter={() => {
                          if (day && !day.isFuture)
                            setTooltip({
                              key: day.key,
                              text: `${day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — ${day.attended ? "Attended ✓" : "Missed"}`,
                            });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {tooltip && day && tooltip.key === day.key && (
                          <div className="absolute z-50 -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-void border border-white/10 rounded-md px-2.5 py-1 text-xs text-white shadow-xl pointer-events-none">
                            {tooltip.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-white/50 text-center mt-1.5">{m.attended}/{m.total}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/55">Past 6 months</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/55">Missed</span>
          <div className="w-3 h-3 rounded-[3px] bg-white/[0.06]" />
          <div className="w-3 h-3 rounded-[3px] bg-emerald-500/40" />
          <div className="w-3 h-3 rounded-[3px] bg-emerald-500" />
          <span className="text-xs text-white/55">Attended</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MONTHLY ATTENDANCE DONUT CHART
   ================================================================ */

function MonthlyAttendanceChart({ records }) {
  const { attended, totalDays, daysPassed, percentage, monthLabel } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysPassed = now.getDate();
    const monthLabel = MONTH_FULL[month];

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const uniqueDays = new Set();
    records.forEach((r) => {
      const ts = new Date(r.timestamp);
      if (ts >= monthStart && ts <= monthEnd) uniqueDays.add(ts.toDateString());
    });
    const attended = uniqueDays.size;
    const percentage = daysPassed > 0 ? Math.round((attended / daysPassed) * 100) : 0;
    return { attended, totalDays, daysPassed, percentage, monthLabel };
  }, [records]);

  const size = 120;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filledRatio = totalDays > 0 ? attended / totalDays : 0;
  const offset = circ - filledRatio * circ;
  const color = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dumbbell size={18} className="text-blood" />
        <span className="text-base font-semibold text-white">{monthLabel} Attendance</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
            <motion.circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
              strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-display text-white">{attended}</span>
            <span className="text-xs text-white/60 -mt-0.5">/{totalDays}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <div className="flex justify-between text-sm text-white/70 mb-1.5">
              <span>Attendance Rate</span>
              <span className="font-semibold text-white">{percentage}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold font-display text-emerald-400">{attended}</p>
              <p className="text-xs text-white/65 mt-0.5">Attended</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold font-display text-white/60">{daysPassed - attended}</p>
              <p className="text-xs text-white/65 mt-0.5">Missed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   DASHBOARD COMPONENT
   ================================================================ */

export default function UserDashboard() {
  const { dbUser } = useAuth();
  const [attendance, setAttendance] = useState({ records: [], totalVisits: 0, lastVisit: null, monthlyCounts: [] });
  const [loadingAtt, setLoadingAtt] = useState(true);

  const isActive = dbUser?.paymentStatus === "active";
  const membership = useMembershipProgress(dbUser?.membershipStartDate, dbUser?.membershipExpiry);

  useEffect(() => {
    if (!isActive) { setLoadingAtt(false); return; }
    api.get("/attendance/my")
      .then((r) => setAttendance(r.data))
      .catch(() => {})
      .finally(() => setLoadingAtt(false));
  }, [isActive]);

  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const match = attendance.monthlyCounts.find((m) => m._id.year === d.getFullYear() && m._id.month === d.getMonth() + 1);
      months.push({ label: MONTH_SHORT[d.getMonth()], count: match ? match.count : 0 });
    }
    return months;
  }, [attendance.monthlyCounts]);

  const statusVariant = isActive ? "active" : dbUser?.paymentStatus === "pending" ? "pending" : "expired";

  const streakMsg = (s) => {
    if (s === 0) return "Start your streak today!";
    if (s < 3) return "Keep it going — momentum is building!";
    if (s < 7) return "Great consistency this week!";
    if (s < 14) return "You're on fire — unstoppable!";
    return "Legendary dedication! 💪";
  };

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <UserLayout>
      {/* ── Outer container: max-w-6xl (1152px), centred, balanced padding ── */}
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 pb-10">

        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blood/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blood/3 rounded-full blur-[100px]" />
        </div>

        {/* All rows stacked vertically with consistent 24px gap */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex flex-col gap-6"
        >

          {/* ════════════════════════════════════════════════════
              ROW 1 — PROFILE HEADER (full width)
             ════════════════════════════════════════════════════ */}
          <motion.div variants={fadeUp} custom={0}>
            <Card className="p-0 overflow-hidden border-white/8">
              {/* Gradient band */}
              <div className="h-16 sm:h-20 bg-gradient-to-r from-blood/30 via-blood/10 to-transparent relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
              </div>
              <div className="px-5 sm:px-6 pb-5 -mt-8 relative z-10">
                {/* Top row: Avatar + Name/Info + Badge — all vertically centred */}
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blood to-blood/60 flex items-center justify-center text-white text-xl sm:text-2xl font-bold font-display shadow-lg shadow-blood/20 border-4 border-surface shrink-0">
                    {(dbUser?.name || "?")[0].toUpperCase()}
                  </div>
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold uppercase tracking-tight text-white truncate leading-tight">
                      {dbUser?.name || "Member"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-white/90 flex items-center gap-1.5">
                        <Mail size={14} className="shrink-0 text-white/60" /> {dbUser?.email || "—"}
                      </span>
                      <span className="text-sm text-white/90 flex items-center gap-1.5">
                        <CalendarDays size={14} className="shrink-0 text-white/60" /> Joined {formatDate(dbUser?.joinDate, { year: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                  {/* Badge */}
                  <Badge
                    variant={statusVariant}
                    className={`text-xs sm:text-sm shrink-0 self-start mt-2 ${isActive ? "shadow-md shadow-emerald-500/20" : ""}`}
                  >
                    {isActive ? "Active" : dbUser?.paymentStatus === "pending" ? "Pending" : "Expired"}
                  </Badge>
                </div>

                {/* Pills row — aligned with the name (left-padded past avatar) */}
                {isActive && (
                  <div className="flex flex-wrap items-center gap-2.5 mt-4 ml-[72px] sm:ml-[80px]">
                    {[
                      { icon: Shield, label: formatPlanName(dbUser?.membershipPlan) + " Plan" },
                      { icon: Activity, label: `${membership.daysRemaining} days left` },
                      { icon: TrendingUp, label: `${dbUser?.currentStreak || 0} day streak` },
                    ].map((pill) => (
                      <span key={pill.label} className="inline-flex items-center gap-1.5 bg-white/[0.08] border border-white/15 rounded-full px-3.5 py-1.5 text-sm font-medium text-white leading-none">
                        <pill.icon size={13} className="text-blood shrink-0" /> {pill.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Blocked alert */}
          {dbUser?.isBlocked && (
            <motion.div variants={fadeUp} custom={0.5}>
              <div className="rounded-xl border border-blood/30 bg-blood/10 px-5 py-4 flex items-center gap-3">
                <AlertCircle size={20} className="text-blood shrink-0" />
                <p className="text-sm leading-relaxed text-blood">Your account is currently blocked. Please contact the front desk.</p>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════
              ACTIVE MEMBERSHIP — ROW-BASED LAYOUT
             ════════════════════════════════════════════════════ */}
          {isActive ? (
            <>
              {/* ──────────────────────────────────────────────
                  ROW 2 — STATS CARDS (4 equal columns)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={1}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Target, label: "Total Visits", value: attendance.totalVisits, color: "text-blue-400", bg: "from-blue-500/10 to-blue-500/5" },
                    { icon: Flame, label: "Current Streak", value: dbUser?.currentStreak || 0, color: "text-orange-400", bg: "from-orange-500/10 to-orange-500/5" },
                    { icon: Activity, label: "Days Left", value: membership.daysRemaining, color: membership.isExpiringSoon ? "text-yellow-400" : "text-emerald-400", bg: membership.isExpiringSoon ? "from-yellow-500/10 to-yellow-500/5" : "from-emerald-500/10 to-emerald-500/5" },
                    { icon: Clock, label: "Last Visit", value: attendance.lastVisit ? formatDate(attendance.lastVisit, { month: "short", day: "numeric" }) : "—", isText: true, color: "text-purple-400", bg: "from-purple-500/10 to-purple-500/5" },
                  ].map((stat) => (
                    <Card
                      key={stat.label}
                      className={`p-5 bg-gradient-to-br ${stat.bg} border-white/8 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5`}
                    >
                      <stat.icon size={20} className={`${stat.color} mb-2`} />
                      <p className="text-3xl font-bold font-display text-white leading-none">
                        {stat.isText ? stat.value : <CountUp to={stat.value} />}
                      </p>
                      <p className="text-sm text-white/70 mt-1.5 uppercase tracking-wider leading-relaxed">{stat.label}</p>
                    </Card>
                  ))}
                </div>
              </motion.div>

              {/* ──────────────────────────────────────────────
                  ROW 3 — MEMBERSHIP DETAILS + TIME REMAINING (50/50)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left — Membership Details */}
                  <Card className="border-white/8">
                    <CardTitle className="flex items-center gap-2 mb-5">
                      <CreditCard size={20} className="text-blood" />
                      Membership Details
                    </CardTitle>
                    <CardContent className="space-y-4">
                      {[
                        { label: "Plan", value: formatPlanName(dbUser?.membershipPlan) },
                        { label: "Start", value: formatDate(dbUser?.membershipStartDate) },
                        { label: "Expiry", value: formatDate(dbUser?.membershipExpiry) },
                        { label: "Status", value: "Active", valueClass: "text-emerald-400" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-sm uppercase tracking-wider text-white/70 leading-relaxed">{row.label}</span>
                          <span className={`text-sm font-semibold leading-relaxed ${row.valueClass || "text-white"}`}>{row.value}</span>
                        </div>
                      ))}
                      {/* Progress bar */}
                      <div className="pt-3">
                        <div className="flex justify-between text-sm text-white/65 mb-2">
                          <span>Progress</span>
                          <span className="font-medium text-white/80">{Math.round(membership.progress)}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${membership.progress}%` }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                            className={`h-full rounded-full ${
                              membership.progress >= 90 ? "bg-red-500" : membership.progress >= 70 ? "bg-yellow-500" : "bg-emerald-500"
                            }`}
                          />
                        </div>
                      </div>
                      {membership.isExpiringSoon && (
                        <Link to="/onboarding/membership" className="block pt-2">
                          <Button size="sm" className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-sm">
                            <RefreshCw size={14} /> Renew Membership
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>

                  {/* Right — Time Remaining */}
                  <Card className={`border-white/8 flex flex-col items-center justify-center text-center py-8 ${
                    membership.isExpiringSoon
                      ? "bg-gradient-to-br from-yellow-500/5 to-surface"
                      : "bg-gradient-to-br from-emerald-500/5 to-surface"
                  }`}>
                    <p className="text-sm uppercase tracking-wider text-white/70 mb-4 leading-relaxed">Time Remaining</p>
                    <ProgressRing progress={membership.progress} size={140}>
                      <motion.p
                        animate={membership.isExpiringSoon ? { scale: [1, 1.08, 1] } : {}}
                        transition={membership.isExpiringSoon ? { duration: 2, repeat: Infinity } : {}}
                        className={`text-4xl font-bold font-display ${
                          membership.isExpired ? "text-red-500" : membership.isExpiringSoon ? "text-yellow-400" : "text-emerald-400"
                        }`}
                      >
                        {membership.daysRemaining}
                      </motion.p>
                      <p className="text-sm text-white/65 uppercase tracking-wider">
                        {membership.daysRemaining === 1 ? "day" : "days"} left
                      </p>
                    </ProgressRing>
                    <p className="text-sm text-white/70 mt-4 px-4 leading-relaxed">
                      Expires{" "}
                      <span className={`font-semibold ${membership.isExpiringSoon ? "text-yellow-400" : "text-emerald-400"}`}>
                        {formatDate(dbUser?.membershipExpiry, { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </p>
                  </Card>
                </div>
              </motion.div>

              {/* ──────────────────────────────────────────────
                  ROW 4 — 6-MONTH OVERVIEW CHART (full width)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={3}>
                <Card className="border-white/8">
                  <CardTitle className="flex items-center gap-2 mb-5">
                    <BarChart3 size={20} className="text-blood" />
                    6-Month Attendance Overview
                  </CardTitle>
                  <CardContent>
                    {loadingAtt ? (
                      <div className="h-44 flex items-center justify-center text-white/50 text-sm">Loading...</div>
                    ) : (
                      <MonthCards data={chartData} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ──────────────────────────────────────────────
                  ROW 5 — STREAK (full width)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={4}>
                <Card className="border-white/8 bg-gradient-to-br from-orange-500/5 to-surface">
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    {/* Streak icon + number */}
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={(dbUser?.currentStreak || 0) > 0 ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={(dbUser?.currentStreak || 0) > 0 ? { duration: 1.5, repeat: Infinity, repeatDelay: 1 } : {}}
                        className="h-14 w-14 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0"
                      >
                        <Flame size={28} className="text-orange-400" />
                      </motion.div>
                      <div>
                        <span className="font-display text-5xl sm:text-6xl font-bold text-white block leading-none">
                          <CountUp to={dbUser?.currentStreak || 0} />
                        </span>
                        <span className="text-sm text-white/70 mt-1 block leading-relaxed">consecutive days</span>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="hidden sm:block w-px h-16 bg-white/8" />
                    <div className="sm:hidden w-full h-px bg-white/8" />
                    {/* Message */}
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-base text-white/70 italic leading-relaxed">{streakMsg(dbUser?.currentStreak || 0)}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* ──────────────────────────────────────────────
                  ROW 6 — HEATMAP + MONTHLY CHART (50/50)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={5}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Heatmap */}
                  <Card className="border-white/8 bg-gradient-to-br from-emerald-500/[0.03] to-surface">
                    {loadingAtt ? (
                      <div className="h-52 flex items-center justify-center text-white/50 text-sm">Loading heatmap...</div>
                    ) : (
                      <AttendanceHeatmap records={attendance.records} />
                    )}
                  </Card>

                  {/* Monthly donut */}
                  <Card className="border-white/8">
                    {loadingAtt ? (
                      <div className="h-52 flex items-center justify-center text-white/50 text-sm">Loading chart...</div>
                    ) : (
                      <MonthlyAttendanceChart records={attendance.records} />
                    )}
                  </Card>
                </div>
              </motion.div>

              {/* ──────────────────────────────────────────────
                  ROW 7 — VERIFY FACE CTA (full width)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={6}>
                <Link to="/verify" className="block">
                  <motion.div whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Card className="p-0 overflow-hidden border-blood/30 bg-gradient-to-r from-blood/15 via-blood/10 to-surface hover:border-blood/50 transition-all duration-300 cursor-pointer group">
                      <div className="flex items-center gap-4 p-5 sm:p-6">
                        <div className="h-14 w-14 rounded-xl bg-blood/20 flex items-center justify-center group-hover:bg-blood/30 transition-colors shrink-0 shadow-lg shadow-blood/10">
                          <ScanFace size={28} className="text-blood" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white leading-tight">Verify Face & Enter</h3>
                          <p className="text-sm text-white/65 mt-1 leading-relaxed">Scan your face for gym access</p>
                        </div>
                        <ArrowRight size={22} className="text-white/50 group-hover:text-blood group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    </Card>
                  </motion.div>
                </Link>
              </motion.div>

              {/* ──────────────────────────────────────────────
                  ROW 8 — QUICK ACTIONS + TIMELINE (side by side)
                 ────────────────────────────────────────────── */}
              <motion.div variants={fadeUp} custom={7}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quick Actions */}
                  <div>
                    <p className="text-sm uppercase tracking-wider text-white/60 mb-3 px-1 leading-relaxed">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { to: "/onboarding/membership", icon: RefreshCw, label: "Renew Plan", color: "text-emerald-400" },
                        { to: "/complete-profile", icon: User, label: "Update Profile", color: "text-blue-400" },
                        { to: "/verify", icon: ScanFace, label: "Face Verify", color: "text-blood" },
                        { to: "/onboarding/face-registration", icon: Zap, label: "Re-register Face", color: "text-purple-400" },
                      ].map((action) => (
                        <Link key={action.label} to={action.to}>
                          <Card className="p-4 border-white/8 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer text-center group h-full">
                            <action.icon size={22} className={`${action.color} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                            <p className="text-sm text-white/75 font-medium leading-relaxed">{action.label}</p>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <Card className="border-white/8">
                    <CardTitle className="mb-5">Membership Timeline</CardTitle>
                    <CardContent>
                      <div className="space-y-5">
                        {[
                          { icon: CheckCircle2, label: "Joined", sub: formatDate(dbUser?.joinDate, { month: "short", year: "numeric" }), done: true },
                          { icon: CreditCard, label: "Plan Activated", sub: formatPlanName(dbUser?.membershipPlan), done: true },
                          { icon: Activity, label: "Active", sub: `${membership.daysRemaining} days left`, done: true, active: true },
                          { icon: AlertCircle, label: "Expiry", sub: formatDate(dbUser?.membershipExpiry, { month: "short", day: "numeric" }), done: false },
                        ].map((step, idx) => (
                          <div key={step.label} className="flex items-start gap-3 relative">
                            {idx < 3 && (
                              <div className={`absolute top-8 left-[15px] w-0.5 h-[calc(100%+4px)] ${step.done ? "bg-emerald-500/30" : "bg-white/8"}`} />
                            )}
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 relative z-10 ${
                              step.active
                                ? "bg-emerald-500/20 border-2 border-emerald-500 shadow-md shadow-emerald-500/20"
                                : step.done
                                ? "bg-emerald-500/20 border border-emerald-500/50"
                                : "bg-white/5 border border-white/15"
                            }`}>
                              <step.icon size={14} className={step.done ? "text-emerald-400" : "text-white/30"} />
                            </div>
                            <div className="pt-1 min-w-0">
                              <p className={`text-sm font-semibold leading-relaxed ${step.active ? "text-emerald-400" : step.done ? "text-white/85" : "text-white/55"}`}>
                                {step.label}
                              </p>
                              <p className="text-sm text-white/60 mt-0.5 leading-relaxed">{step.sub}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </>
          ) : (
            /* ════════════════════════════════════════════════
               INACTIVE MEMBERSHIP
               ════════════════════════════════════════════════ */
            <div className="max-w-xl mx-auto space-y-6">
              <motion.div variants={fadeUp} custom={1}>
                <Card className="p-0 overflow-hidden border-white/8">
                  <div className="relative p-8 sm:p-10 text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blood/10 rounded-full blur-[80px]" />
                    <div className="relative z-10">
                      <div className="h-16 w-16 rounded-full bg-blood/15 border border-blood/30 flex items-center justify-center mx-auto mb-5">
                        <CreditCard size={28} className="text-blood" />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-3 leading-tight">No Active Membership</h2>
                      <p className="text-sm text-white/70 max-w-sm mx-auto mb-6 leading-relaxed">
                        Choose a membership plan to unlock gym access, face verification, attendance tracking, and more.
                      </p>
                      <Link to="/onboarding/membership">
                        <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                          <CreditCard size={18} /> Get Membership <ArrowRight size={16} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp} custom={2}>
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium leading-relaxed">Membership Required</p>
                    <p className="text-sm text-yellow-400/60 mt-1 leading-relaxed">
                      Activate a membership to access all gym features including face verification and attendance tracking.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </UserLayout>
  );
}
