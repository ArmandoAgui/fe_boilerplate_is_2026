"use client";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div role="alert" className="panel m-6">
      <p>No se pudo completar la operación. Intente de nuevo.</p>
      <button className="button mt-4" onClick={retry}>
        Reintentar
      </button>
    </div>
  );
}
