"use client";

import { Input } from "@/app/_components/ui/Input";
import type { AbDestination } from "./types";

// Weighted A/B destination editor. Empty list = A/B disabled (primary URL used).
export default function AbBuilder({
  arms,
  onChange,
}: {
  arms: AbDestination[];
  onChange: (arms: AbDestination[]) => void;
}) {
  function update(i: number, patch: Partial<AbDestination>) {
    onChange(arms.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  return (
    <div className="flex flex-col gap-2">
      {arms.map((arm, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="url"
            placeholder="https://variant.example.com"
            value={arm.url}
            onChange={(e) => update(i, { url: e.target.value })}
            className="flex-1"
          />
          <Input
            type="number"
            min={1}
            max={100}
            value={arm.weight}
            onChange={(e) => update(i, { weight: Number(e.target.value) })}
            className="w-20"
            title="Weight"
          />
          <button
            type="button"
            onClick={() => onChange(arms.filter((_, idx) => idx !== i))}
            aria-label="Remove variant"
            className="px-2 text-muted-2 hover:text-rose-600"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...arms, { url: "", weight: 50 }])}
        className="self-start text-xs font-medium text-brand hover:underline"
      >
        + Add variant
      </button>
      {arms.length === 1 && (
        <p className="text-xs text-amber-600">A/B split needs at least two variants.</p>
      )}
    </div>
  );
}
