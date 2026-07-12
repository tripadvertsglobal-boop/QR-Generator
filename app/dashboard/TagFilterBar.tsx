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
    `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-foreground text-background"
        : "border border-border bg-surface text-muted hover:bg-black/[0.03] hover:text-foreground"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
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
