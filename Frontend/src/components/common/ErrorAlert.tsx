import { AlertCircle, X } from "lucide-react";
export default function ErrorAlert({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
    >
      <AlertCircle className="mt-0.5 shrink-0" size={18} />
      <span>{message}</span>
      <button
        className="ml-auto shrink-0 text-rose-200 hover:text-white"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        <X size={17} />
      </button>
    </div>
  );
}
