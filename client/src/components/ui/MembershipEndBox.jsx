import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Displays a styled square box showing days remaining until membership expiry.
 * Dynamically calculates based on current date and membership end date.
 */
export default function MembershipEndBox({ membershipExpiry }) {
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const calculateDaysRemaining = () => {
      if (!membershipExpiry) {
        setDaysRemaining(0);
        return;
      }

      const expiryDate = new Date(membershipExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);

      const timeDiff = expiryDate - today;
      const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      setDaysRemaining(Math.max(0, days));
    };

    calculateDaysRemaining();

    // Update every hour to keep the count accurate
    const interval = setInterval(calculateDaysRemaining, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [membershipExpiry]);

  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center w-32 h-32 rounded-lg font-bold text-center transition-all ${
        isExpired
          ? "bg-blood/20 border-2 border-blood text-blood"
          : isExpiringSoon
          ? "bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400"
          : "bg-green-500/20 border-2 border-green-500 text-green-400"
      }`}
    >
      <div className="text-sm uppercase tracking-wider opacity-75">END</div>
      <div className="text-4xl font-display mt-2">{daysRemaining}</div>
      <div className="text-xs uppercase tracking-wider opacity-75 mt-1">
        {daysRemaining === 1 ? "day" : "days"}
      </div>
    </motion.div>
  );
}
