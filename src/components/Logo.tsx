import Link from "next/link";

/** The original Cucina Loca wordmark (v1): Playfair Display, sage "Cucina" + blood-orange italic "Loca". */
export function Logo({ className = "text-2xl", href = "/" }: { className?: string; href?: string | null }) {
  const mark = (
    <span className={`inline-flex items-baseline font-serif font-bold ${className}`}>
      <span className="text-brand-sage">Cucina</span>
      <span className="text-brand-orange italic">Loca</span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="Cucina Loca home">
      {mark}
    </Link>
  ) : (
    mark
  );
}
