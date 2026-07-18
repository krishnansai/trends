import type { StyleVaultItem } from "@/lib/style-vault";

export type StyleEvolutionAxis = "Formal" | "Gorpcore" | "Minimalist" | "Streetwear" | "Vintage";

export type StyleEvolutionPoint = {
  axis: StyleEvolutionAxis;
  score: number;
};

const axisKeywords: Record<StyleEvolutionAxis, string[]> = {
  Formal: ["formal", "office", "tailor", "tailored", "blazer", "trouser", "loafer", "smart"],
  Gorpcore: ["gorp", "utility", "outdoor", "nylon", "weather", "parka", "cargo", "trail"],
  Minimalist: ["minimal", "minimalist", "quiet", "clean", "neutral", "simple", "monochrome"],
  Streetwear: ["street", "streetwear", "oversized", "hoodie", "graphic", "cargo", "sneaker", "boxy"],
  Vintage: ["vintage", "retro", "y2k", "heritage", "mullet", "beardstache", "suede", "denim"]
};

function collectText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(collectText).join(" ");
  }

  return "";
}

export function buildStyleEvolution(items: StyleVaultItem[]) {
  const corpus = items
    .map((item) => [item.title, item.subtitle, collectText(item.payload)].join(" "))
    .join(" ")
    .toLowerCase();
  const denominator = Math.max(4, items.length * 5);
  const chartData = (Object.keys(axisKeywords) as StyleEvolutionAxis[]).map((axis) => {
    const rawScore = axisKeywords[axis].reduce((score, keyword) => {
      const matches = corpus.match(new RegExp(`\\b${keyword}\\b`, "g"))?.length ?? 0;
      return score + matches;
    }, 0);

    return {
      axis,
      score: Math.min(100, Math.max(items.length ? 12 : 0, Math.round((rawScore / denominator) * 100)))
    };
  });
  const dominant = [...chartData].sort((first, second) => second.score - first.score)[0];

  return {
    chartData,
    dominantAxis: dominant?.axis ?? "Minimalist",
    savedCount: items.length
  };
}
