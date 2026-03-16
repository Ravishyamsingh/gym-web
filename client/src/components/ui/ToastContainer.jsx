import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { ToastContext } from "@/context/ToastContext";
import { useContext } from "react";

const toastStyles = {
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/30",
    text: "text-yellow-400",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-400",
    icon: Info,
  },
};

function ToastItem({ toast, onRemove }) {
  const style = toastStyles[toast.type] || toastStyles.info;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`${style.bg} border backdrop-blur-sm rounded-lg p-3 flex items-start gap-3 max-w-sm shadow-lg`}
    >
      <Icon size={18} className={`${style.text} mt-0.5 shrink-0`} />
      <p className={`${style.text} text-sm font-medium flex-1`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`${style.text} hover:opacity-75 shrink-0`}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
