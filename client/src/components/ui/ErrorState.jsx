import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ErrorState({ message = "Failed to load data", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-blood/10 p-4 rounded-lg mb-4">
        <AlertCircle size={32} className="text-blood" />
      </div>
      <p className="text-white/60 text-sm mb-4 text-center">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={onRetry}
        >
          <RotateCcw size={14} />
          Retry
        </Button>
      )}
    </div>
  );
}
