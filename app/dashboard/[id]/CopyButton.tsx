"use client";

import { useState } from "react";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
    >
      {copied ? "Copied!" : "Copy tracking URL"}
    </button>
  );
}
