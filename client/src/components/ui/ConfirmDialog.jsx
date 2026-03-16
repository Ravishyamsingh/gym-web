import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({ isOpen, title, message, confirmText = "Confirm", cancelText = "Cancel", isPending = false, variant = "warn", onConfirm, onCancel }) {
  const variantStyles = {
    warn: {
      icon: "text-yellow-400",
      buttonVariant: "default",
    },
    danger: {
      icon: "text-blood",
      buttonVariant: "destructive",
    },
  };

  const style = variantStyles[variant] || variantStyles.warn;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
          >
            <div className="bg-surface border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className={`${style.icon} mt-1`}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold text-light">{title}</h3>
                  <p className="text-sm text-white/60 mt-1">{message}</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  {cancelText}
                </Button>
                <Button
                  variant={style.buttonVariant}
                  size="sm"
                  onClick={onConfirm}
                  disabled={isPending}
                  className="min-w-[100px]"
                >
                  {isPending ? "..." : confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
