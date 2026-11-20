import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel">
      <h1>Área inexistente o inactiva</h1>
      <Link className="button mt-4" href="/areas">
        Volver a áreas
      </Link>
    </section>
  );
}
