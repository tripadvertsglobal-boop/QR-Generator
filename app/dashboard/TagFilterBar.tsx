import Link from "next/link";

// Tag filter chips. Preserves the active folder while toggling the tag filter.
export default function TagFilterBar({
  tags,
  activeTag,
  folder,
}: {
  tags: string[];
  activeTag: string | null;
  folder: string | null;
}) {
  if (tags.length === 0) return null;

  const hrefFor = (tag: string | null) => {
    const sp = new URLSearchParams();
    if (folder) sp.set("folder", folder);
    if (tag) sp.set("tag", tag);
    const qs = sp.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1 text-xs font-semibold no-underline transition-colors ${
      active
        ? "bg-brand text-brand-foreground"
        : "border border-border text-muted hover:border-border-strong hover:text-foreground"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3 sm:px-8">
      <span className="mr-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">
        Tags
      </span>
      <Link href={hrefFor(null)} className={chip(activeTag === null)}>
        All tags
      </Link>
      {tags.map((tag) => (
        <Link key={tag} href={hrefFor(tag)} className={chip(activeTag === tag)}>
          {tag}
        </Link>
      ))}
    </div>
  );
}
