export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-paper" aria-busy="true" aria-label="Loading Tinjau product page">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1440px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <div className="h-5 w-52 animate-pulse bg-black/10 motion-reduce:animate-none" />
          <div className="mt-8 h-40 animate-pulse bg-black/10 motion-reduce:animate-none" />
          <div className="mt-7 h-24 animate-pulse bg-black/10 motion-reduce:animate-none" />
        </div>
        <div className="min-h-[620px] animate-pulse border border-black/20 bg-paper-bright motion-reduce:animate-none" />
      </div>
    </div>
  );
}
