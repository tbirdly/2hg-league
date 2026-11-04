import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-muted">That card isn&apos;t in this deck.</p>
      <Link href="/" className="btn mt-6">
        Back to standings
      </Link>
    </div>
  );
}
