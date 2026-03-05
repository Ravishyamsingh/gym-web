import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, ChevronDown } from "lucide-react";

export default function AccountDropdown() {
  const { dbUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Calculate days remaining
  useEffect(() => {
    if (!dbUser?.membershipExpiry) {
      setDaysRemaining(0);
      return;
    }

    const expiryDate = new Date(dbUser.membershipExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const timeDiff = expiryDate - today;
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    setDaysRemaining(Math.max(0, days));
  }, [dbUser?.membershipExpiry]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate("/");
  };

  const membershipStatusColor =
    dbUser?.paymentStatus === "active"
      ? "text-green-400"
      : dbUser?.paymentStatus === "expired"
      ? "text-blood"
      : "text-yellow-400";

  const membershipStatusLabel =
    dbUser?.paymentStatus === "active"
      ? "Active"
      : dbUser?.paymentStatus === "expired"
      ? "Expired"
      : "Pending";

  const membershipPlanLabel =
    dbUser?.membershipPlan === "1month"
      ? "1 Month"
      : dbUser?.membershipPlan === "6months"
      ? "6 Months"
      : dbUser?.membershipPlan === "1year"
      ? "1 Year"
      : "—";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blood/20 border border-blood/40">
          <User size={18} className="text-blood" />
        </div>
        <ChevronDown
          size={16}
          className={`text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blood/10 to-blood/5 px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blood/20 border border-blood/40">
                  <User size={24} className="text-blood" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-light leading-tight">
                    {dbUser?.name || "User"}
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">{dbUser?.email}</p>
                </div>
              </div>
            </div>

            {/* Account Details Section */}
            <div className="px-6 py-4 space-y-3 border-b border-white/5">
              {/* Join Date */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Joined</span>
                <span className="text-sm font-medium text-light">
                  {dbUser?.joinDate
                    ? new Date(dbUser.joinDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              {/* Membership Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Status</span>
                <span className={`text-sm font-semibold ${membershipStatusColor}`}>
                  {membershipStatusLabel}
                </span>
              </div>

              {/* Membership Plan */}
              {dbUser?.paymentStatus === "active" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Plan</span>
                    <span className="text-sm font-medium text-light">
                      {membershipPlanLabel}
                    </span>
                  </div>

                  {/* Days Remaining */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Days Left</span>
                    <span className="text-sm font-semibold text-green-400">
                      {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                    </span>
                  </div>

                  {/* Membership Dates */}
                  <div className="pt-2 mt-2 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-white/50">Start</span>
                      <span className="text-xs text-white/70">
                        {dbUser?.membershipStartDate
                          ? new Date(dbUser.membershipStartDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/50">End</span>
                      <span className="text-xs text-white/70">
                        {dbUser?.membershipExpiry
                          ? new Date(dbUser.membershipExpiry).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Logout Button */}
            <div className="px-6 py-3 bg-white/2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blood/20 hover:bg-blood/30 border border-blood/40 hover:border-blood/60 rounded-lg transition-all text-blood font-medium text-sm"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
