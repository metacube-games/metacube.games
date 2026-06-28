export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black">
      <div className="w-full max-w-md space-y-4 p-6">
        <div className="h-8 w-3/4 animate-pulse rounded-md bg-neutral-800" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-800" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-800" />
        <div className="mt-6 h-12 w-full animate-pulse rounded-md bg-neutral-800" />
      </div>
    </div>
  );
}
