export default function DemoLoading() {
  return (
    <div role="status" className="demo-shell" aria-busy="true" aria-label="Loading guided demo">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid min-h-72 border border-edge lg:grid-cols-2">
          <div className="animate-pulse border-b border-edge bg-canvas-soft lg:border-b-0 lg:border-r motion-reduce:animate-none" />
          <div className="animate-pulse bg-surface/40 motion-reduce:animate-none" />
        </div>
        <div className="mt-5 h-24 animate-pulse border border-edge bg-canvas-soft motion-reduce:animate-none" />
        <div className="mt-5 min-h-96 animate-pulse border border-edge bg-canvas-soft/60 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
