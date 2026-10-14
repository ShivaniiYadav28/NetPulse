export default function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-sm text-slate-400">
      {label}
    </p>
  );
}
