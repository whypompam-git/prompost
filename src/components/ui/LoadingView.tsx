// Placeholder while a page loads: soft shimmering blocks shaped like content,
// so the screen never looks frozen or empty.
export function LoadingView() {
  return (
    <div className="flex-1 space-y-3 p-4 sm:p-6" aria-busy="true" aria-label="กำลังโหลด">
      <div className="pp-skel h-6 w-40 rounded-lg" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="pp-skel aspect-square rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="pp-skel h-20 rounded-2xl" />
      <div className="pp-skel h-20 rounded-2xl" style={{ animationDelay: "120ms" }} />
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  );
}
