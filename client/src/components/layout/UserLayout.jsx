import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Home, ScanFace, CreditCard } from "lucide-react";
import AccountDropdown from "@/components/ui/AccountDropdown";
import api from "@/lib/api";

/**
 * Mobile-optimised shell for the user-facing pages.
 * Bottom tab bar for one-thumb reach (as specified in the design doc).
 */
export default function UserLayout({ children }) {
  const { dbUser } = useAuth();
  const [sessionState, setSessionState] = useState({
    isInGym: false,
    hasLongSessionAlert: false,
    durationMinutes: 0,
  });

  const hasActiveMembership = dbUser?.paymentStatus === "active";

  useEffect(() => {
    let timer;
    let mounted = true;

    const fetchSession = async () => {
      if (!dbUser) return;
      try {
        const { data } = await api.get("/attendance/session");
        if (!mounted) return;
        setSessionState({
          isInGym: !!data?.isInGym,
          hasLongSessionAlert: !!data?.hasLongSessionAlert,
          durationMinutes: data?.durationMinutes || 0,
        });
      } catch {
        if (!mounted) return;
        setSessionState((prev) => ({ ...prev, isInGym: false }));
      }
    };

    fetchSession();
    timer = setInterval(fetchSession, 15000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [dbUser?._id]);

  return (
    <div className="flex min-h-screen flex-col bg-void">
      {/* ── Top bar (minimal) ─────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-surface px-4">
        <span className="font-display text-xl font-bold tracking-wider text-light">
          GYM<span className="text-blood">WEB</span>
        </span>
        <div className="flex items-center gap-2">
          {sessionState.isInGym && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                sessionState.hasLongSessionAlert
                  ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-300"
                  : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              In Gym{sessionState.hasLongSessionAlert ? ` (${sessionState.durationMinutes}m)` : ""}
            </span>
          )}
          <AccountDropdown inGymStatus={sessionState} />
        </div>
      </header>

      {/* ── Content ��──────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4">{children}</main>

      {/* ── Bottom nav (mobile-first) ─────── */}
      <nav className="flex border-t border-white/5 bg-surface safe-bottom">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              isActive ? "text-blood" : "text-white/40"
            }`
          }
        >
          <Home size={20} />
          Home
        </NavLink>
        {!hasActiveMembership && (
          <NavLink
            to="/onboarding/membership"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                isActive ? "text-blood" : "text-white/40"
              }`
            }
          >
            <CreditCard size={20} />
            Membership
          </NavLink>
        )}
        {hasActiveMembership && (
          <NavLink
            to="/verify?action=entry"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                isActive ? "text-blood" : "text-white/40"
              }`
            }
          >
            <ScanFace size={20} />
            Verify
          </NavLink>
        )}
      </nav>
    </div>
  );
}
