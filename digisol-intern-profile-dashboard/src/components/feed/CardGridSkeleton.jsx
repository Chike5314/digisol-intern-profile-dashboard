export function CardGridSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-[var(--line)] bg-[var(--surface)] p-5 animate-pulse">
          <div className="h-48 w-full bg-[var(--paper)]" />
          <div className="mt-3 h-3 w-2/3 bg-[var(--paper)]" />
          <div className="mt-2 h-3 w-1/3 bg-[var(--paper)]" />
        </div>
      ))}
    </>
  );
}
