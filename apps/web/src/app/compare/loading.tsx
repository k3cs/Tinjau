export default function ComparisonLoading() {
  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)]" aria-busy="true" aria-label="Loading policy comparison">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-44 animate-pulse rounded-lg border border-edge bg-canvas-soft motion-reduce:animate-none" />
        <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="min-h-[620px] animate-pulse bg-canvas-soft/40 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
