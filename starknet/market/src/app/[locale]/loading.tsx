export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-black">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-12">
        <div className="mb-6 h-10 w-64 animate-pulse rounded-md bg-neutral-800" />
        <div className="mb-8 flex flex-wrap gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-neutral-800" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-800" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-neutral-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-md bg-neutral-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
