import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, ScanFace, CreditCard } from "lucide-react";
import AccountDropdown from "@/components/ui/AccountDropdown";

/**
 * Mobile-optimised shell for the user-facing pages.
 * Bottom tab bar for one-thumb reach (as specified in the design doc).
 */
export default function UserLayout({ children }) {
  const { dbUser } = useAuth();

  const hasActiveMembership = dbUser?.paymentStatus === "active";

  return (
    <div className="flex min-h-screen flex-col bg-void">
      {/* ── Top bar (minimal) ─────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-surface px-4">
        <span className="font-display text-xl font-bold tracking-wider text-light">
          GYM<span className="text-blood">WEB</span>
        </span>
        <AccountDropdown />
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
            to="/verify"
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
