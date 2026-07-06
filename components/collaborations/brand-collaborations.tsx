"use client";

import { BarChart3, Check } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Trend } from "@/lib/types";

export function BrandCollaborations({
  trends,
  defaultTrendId,
  isUsingSampleData
}: {
  trends: Trend[];
  defaultTrendId?: string;
  isUsingSampleData: boolean;
}) {
  const defaultTrend = useMemo(() => {
    return trends.some((trend) => trend.id === defaultTrendId) ? defaultTrendId : trends[0]?.id;
  }, [defaultTrendId, trends]);
  const insightData = useMemo(
    () =>
      trends
        .slice()
        .sort((first, second) => second.confidence_score - first.confidence_score)
        .slice(0, 5)
        .map((trend) => ({
          aesthetic: trend.title,
          score: trend.confidence_score
        })),
    [trends]
  );

  const [selectedTrend, setSelectedTrend] = useState(defaultTrend ?? "");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Brand Collaborations</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Partnership pipeline</h1>
        </div>
        <div className="flex items-center gap-3">
          {isUsingSampleData ? <Badge>Sample data</Badge> : <Badge>Original data</Badge>}
          <Badge>{trends.length} trend options</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="border border-border bg-background p-5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">This Quarter</p>
              <h2 className="mt-1 text-2xl font-semibold">Top Trending Aesthetics</h2>
            </div>
            <div className="grid size-11 place-items-center border border-border">
              <BarChart3 className="size-5" />
            </div>
          </div>

          {insightData.length ? (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insightData} layout="vertical" margin={{ left: 18, right: 12 }}>
                  <CartesianGrid stroke="#d5cab9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="aesthetic"
                    type="category"
                    width={116}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#eee7da" }}
                    contentStyle={{
                      border: "1px solid #cfc4b3",
                      borderRadius: 0,
                      color: "#141414"
                    }}
                  />
                  <Bar dataKey="score" fill="#121212" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid h-[360px] place-items-center border border-border bg-muted/35 p-6 text-center">
              <div>
                <p className="font-medium">No original trend rows yet</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ingest sourced trend data locally or into Supabase to populate this chart.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="border border-border bg-background p-5">
          <div>
            <p className="text-sm text-muted-foreground">Partner Request</p>
            <h2 className="mt-1 text-2xl font-semibold">Collaboration inquiry</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input id="brand-name" name="brandName" className="mt-2" required />
            </div>

            <div>
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="trend-select">Upcoming Trend Forecast</Label>
              <Select
                id="trend-select"
                name="trend"
                className="mt-2"
                value={selectedTrend}
                disabled={trends.length === 0}
                onChange={(event) => setSelectedTrend(event.target.value)}
              >
                {trends.length === 0 ? <option value="">No original trends available</option> : null}
                {trends.map((trend) => (
                  <option key={trend.id} value={trend.id}>
                    {trend.title} - {trend.forecast_year}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Inquiry</Label>
              <Textarea
                id="message"
                name="message"
                className="mt-2"
                placeholder="Capsule scope, category interest, market, and timing"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Submit inquiry
            </Button>

            {submitted ? (
              <div className="flex items-center gap-3 border border-border bg-muted p-3 text-sm">
                <Check className="size-4" />
                Inquiry captured for prototype review.
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </section>
  );
}
