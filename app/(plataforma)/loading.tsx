export default function Loading() {
  return (
    <div role="status" className="mx-auto w-full max-w-6xl p-8">
      <p>Cargando…</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl bg-surface-alt"
          />
        ))}
      </div>
    </div>
  );
}
