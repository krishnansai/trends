"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, RadarIcon, Trash2 } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildStyleEvolution } from "@/lib/style-evolution";
import {
  readStyleVault,
  removeStyleVaultItem,
  type StyleVaultItem
} from "@/lib/style-vault";

function getTextPayload(item: StyleVaultItem, key: string) {
  const value = item.payload[key];
  return typeof value === "string" ? value : null;
}

function formatSavedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved look";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function StyleVaultGallery() {
  const [items, setItems] = useState<StyleVaultItem[]>([]);
  const [view, setView] = useState<"evolution" | "vault">("vault");
  const evolution = useMemo(() => buildStyleEvolution(items), [items]);

  function loadItems() {
    setItems(readStyleVault());
  }

  function handleRemove(itemId: string) {
    setItems(removeStyleVaultItem(itemId));
  }

  useEffect(() => {
    const timeout = window.setTimeout(loadItems, 0);
    window.addEventListener("style-vault-updated", loadItems);
    window.addEventListener("storage", loadItems);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("style-vault-updated", loadItems);
      window.removeEventListener("storage", loadItems);
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl animate-fade-in">
      <div className="flex flex-col justify-between gap-4 border-b border-[#D8CCBB] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
            PERSONAL STYLIST
          </p>
          <h1 className="mt-3 text-3xl font-light tracking-[-0.01em] text-neutral-950 md:text-5xl">
            My Vault
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{items.length} saved</Badge>
          <Button
            type="button"
            variant={view === "vault" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("vault")}
          >
            My Looks
          </Button>
          <Button
            type="button"
            variant={view === "evolution" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("evolution")}
          >
            <RadarIcon className="size-4" />
            Style Evolution
          </Button>
        </div>
      </div>

      {view === "evolution" ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#D8CCBB] bg-white/85 p-4 shadow-sm backdrop-blur-xl md:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Vibe Signature
                </p>
                <h2 className="mt-2 text-2xl font-light text-neutral-950">
                  {evolution.dominantAxis} leaning profile
                </h2>
              </div>
              <Badge>{evolution.savedCount} vault signals</Badge>
            </div>

            <div className="mt-5 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={evolution.chartData} outerRadius="72%">
                  <PolarGrid stroke="#D8CCBB" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "#6B5A49", fontSize: 12, fontWeight: 600 }}
                  />
                  <Radar
                    dataKey="score"
                    fill="#7B5637"
                    fillOpacity={0.24}
                    stroke="#7B5637"
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <aside className="border border-[#D8CCBB] bg-[#FBF7F0] p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Progress Tracker
            </p>
            <h3 className="mt-2 text-xl font-light text-neutral-950">
              Your saved looks shape this chart
            </h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Save more outfit grids and grooming specs to shift your distribution across minimalist,
              streetwear, formal, gorpcore, and vintage signals.
            </p>
            <div className="mt-5 space-y-3">
              {evolution.chartData.map((point) => (
                <div key={point.axis}>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    <span>{point.axis}</span>
                    <span>{point.score}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden bg-white">
                    <div
                      className="h-full bg-[#7B5637]"
                      style={{ width: `${point.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : items.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const summary = getTextPayload(item, "summary") ?? getTextPayload(item, "rationale");
            const barberSpecs = getTextPayload(item, "barberSpecs");

            return (
              <article
                key={item.id}
                className="overflow-hidden border border-[#D8CCBB] bg-white/85 shadow-sm backdrop-blur-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#EEE5D7]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-end bg-[#FBF7F0] p-5">
                      <Bookmark className="size-10 text-[#7B5637]" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <Badge className="bg-white/90 text-[#3A2A1E]">
                      {item.type === "outfit" ? "Outfit" : "Grooming"}
                    </Badge>
                    <Badge className="bg-white/90 text-[#3A2A1E]">
                      {formatSavedDate(item.savedAt)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      {item.subtitle}
                    </p>
                    <h2 className="mt-1 text-lg font-medium text-neutral-950">{item.title}</h2>
                  </div>

                  {summary ? (
                    <p className="text-sm leading-6 text-neutral-600">{summary}</p>
                  ) : null}

                  {barberSpecs ? (
                    <div className="border border-[#D8CCBB] bg-[#FBF7F0] p-3 text-xs leading-5 text-neutral-700">
                      {barberSpecs}
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid min-h-[420px] place-items-center border border-[#D8CCBB] bg-white/75 p-6 text-center">
          <div className="max-w-md">
            <div className="mx-auto grid size-14 place-items-center border border-[#D8CCBB] bg-[#FBF7F0]">
              <Bookmark className="size-6 text-[#7B5637]" />
            </div>
            <h2 className="mt-5 text-2xl font-light text-neutral-950">No saved looks yet</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Save outfit grids or grooming cards from the AI Stylist and they will appear here on this browser.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
