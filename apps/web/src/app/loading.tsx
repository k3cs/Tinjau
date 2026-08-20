export default function Loading() {
  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)]" aria-busy="true" aria-label="Loading risk assessment">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-24 animate-pulse rounded-lg border border-edge bg-canvas-soft motion-reduce:animate-none" />
        <div className="mt-5 grid overflow-hidden rounded-lg border border-edge bg-canvas xl:grid-cols-12">
          <div className="min-h-[460px] animate-pulse border-b border-edge bg-canvas-soft/50 xl:col-span-6 xl:border-b-0 xl:border-r motion-reduce:animate-none" />
          <div className="min-h-[460px] animate-pulse border-b border-edge bg-canvas-soft/30 xl:col-span-3 xl:border-b-0 xl:border-r motion-reduce:animate-none" />
          <div className="min-h-[460px] animate-pulse bg-canvas-soft/20 xl:col-span-3 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
