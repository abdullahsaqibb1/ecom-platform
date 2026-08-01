export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner spinner--dark" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
