"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import { Input, Select, Field } from "@/app/_components/ui/Input";
import type { Folder, AbDestination } from "./types";
import AbBuilder from "./AbBuilder";

export default function CreateQrForm({ folders }: { folders: Folder[] }) {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [password, setPassword] = useState("");
  const [ab, setAb] = useState<AbDestination[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      destination_url: destination,
      name: name.trim() || null,
      folder_id: folderId || null,
      tags,
    };
    if (activeFrom) body.active_from = new Date(activeFrom).toISOString();
    if (activeUntil) body.active_until = new Date(activeUntil).toISOString();
    if (password) body.password = password;
    const arms = ab.filter((a) => a.url.trim());
    if (arms.length >= 2) body.ab_destinations = arms;

    const res = await fetch("/api/v1/qrcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
      return;
    }
    setDestination("");
    setName("");
    setTagsText("");
    setActiveFrom("");
    setActiveUntil("");
    setPassword("");
    setAb([]);
    setAdvanced(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Destination URL" className="flex-1">
          <Input type="url" required placeholder="https://example.com" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <Field label="Name (optional)" className="sm:w-40">
          <Input type="text" placeholder="Spring flyer" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Folder" className="sm:w-48">
          <Select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tags (comma-separated)" className="flex-1">
          <Input type="text" placeholder="print, q2-campaign" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </Field>
        <Button type="submit" loading={loading}>Create</Button>
      </div>

      <button type="button" onClick={() => setAdvanced((v) => !v)} className="self-start text-xs font-medium text-brand hover:underline">
        {advanced ? "Hide advanced options" : "Advanced: scheduling, password, A/B"}
      </button>

      {advanced && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-black/[0.015] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Active from" className="flex-1">
              <Input type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} />
            </Field>
            <Field label="Active until" className="flex-1">
              <Input type="datetime-local" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)} />
            </Field>
          </div>
          <Field label="Password (optional, min 4 chars)">
            <Input type="text" placeholder="Leave blank for no password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="A/B split (overrides destination when ≥2 variants)">
            <AbBuilder arms={ab} onChange={setAb} />
          </Field>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}
