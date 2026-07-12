"use client";

import { useState } from "react";
import Button from "@/app/_components/ui/Button";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? "Copied!" : "Copy tracking URL"}
    </Button>
  );
}
