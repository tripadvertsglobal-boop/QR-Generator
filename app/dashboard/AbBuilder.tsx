"use client";

import type { AbDestination } from "./types";

const inputCls =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-black/40 dark:border-white/20";

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
          <input
            type="url"
            placeholder="https://variant.example.com"
            value={arm.url}
            onChange={(e) => update(i, { url: e.target.value })}
            className={`flex-1 ${inputCls}`}
          />
          <input
            type="number"
            min={1}
            max={100}
            value={arm.weight}
            onChange={(e) => update(i, { weight: Number(e.target.value) })}
            className={`w-20 ${inputCls}`}
            title="Weight"
          />
          <button
            type="button"
            onClick={() => onChange(arms.filter((_, idx) => idx !== i))}
            className="px-2 text-black/40 hover:text-red-500 dark:text-white/40"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...arms, { url: "", weight: 50 }])}
        className="self-start text-xs text-blue-600 hover:underline"
      >
        + Add variant
      </button>
      {arms.length === 1 && (
        <p className="text-xs text-amber-600">A/B split needs at least two variants.</p>
      )}
    </div>
  );
}
